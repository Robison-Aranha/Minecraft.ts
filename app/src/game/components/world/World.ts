import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { ChunkBlockGenData, ChunkLayer } from "../interfaces/ChunkGenData";
import {
  getChunksKeysToRender,
  getNearChunksKeysGen,
  hashUint8Array,
  remapMeshIndex,
} from "../utils/Utils";
import { ChunkUserData } from "../interfaces/ChunkUserData";
import { createWorker } from "../workers/WorkerFac";
import { WorkerPaths } from "../workers/WorkerFac";
import { ChunkMsgTypes } from "../enums/ChunkMsgTypes.ts";
import { ChunkMan } from "./ChunkMan.ts";
import { Player } from "../player/Player.ts";
import { Vector3 } from "three";
import { CHUNK_SIZE } from "../const/Const.ts";
import { WorkerPool } from "../workers/WorkerPool.ts";

export class World extends THREE.Group {
  private chunkQt: number | null;
  private material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({
    color: "gray",
  });
  private seed: number | undefined;
  private chunkMan = new ChunkMan();
  private player: Player | undefined;
  private workerPool: WorkerPool;
  private revealingChunks = new Set<THREE.Mesh>();
  private fadingOutChunks = new Map<
    string,
    {
      meshes: THREE.Mesh[];
      start: number;
      dispose: boolean;
      resolve: () => void;
    }
  >();

  constructor(chunkQt: number) {
    super();
    this.chunkQt = chunkQt;
    const cores = navigator.hardwareConcurrency
      ? Math.max(2, navigator.hardwareConcurrency - 1)
      : 4;
    this.workerPool = new WorkerPool(
      () => createWorker(WorkerPaths.CHUNK_GENERATION),
      cores,
    );
  }

  setPlayer(player: Player | undefined) {
    this.player = player;
  }

  getPlayer() {
    return this.player;
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  getSeed() {
    return this.seed;
  }

  getChunkMan() {
    return this.chunkMan;
  }

  generateChunk(
    traceX: number,
    traceY: number,
    type: ChunkMsgTypes,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let neighbourChunks: (Uint8Array[] | undefined)[] = [];
      let currentChunk: Uint8Array[] = [];

      if (type == ChunkMsgTypes.GEN_MESH) {
        neighbourChunks = this.getNeighbourChunks(traceX, traceY);
        currentChunk =
          this.chunkMan.getChunkBlocksMap().get(`${traceX}:${traceY}`) ?? [];
      }

      try {
        const event = await this.workerPool.execute({
          traceX,
          
          traceY,
          seed: this.seed,
          type,
          blockData: currentChunk.map((layer) => layer.buffer),
          neighbourChunks: neighbourChunks.map((n) =>
            n ? n.map((c) => c.buffer) : [],
          ),
        });

        if (type === ChunkMsgTypes.GEN_BLOCK) {
          this.callBackChunkBlock(event, traceX, traceY);
        } else {
          this.callBackChunkMesh(event, traceX, traceY);
        }

        resolve();
      } catch (err) {
        console.error("Worker error in chunk generation:", err);
        reject(err);
      }
    });
  }

  getNeighbourChunks(
    traceX: number,
    traceY: number,
  ): (Uint8Array[] | undefined)[] {
    const chunkNeighbours = getNearChunksKeysGen(traceX, traceY);
    return chunkNeighbours.map((c) => this.chunkMan.getChunkBlocksMap().get(c));
  }

  callBackChunkMesh(e: { data: any }, traceX: number, traceY: number): void {
    const { faceToKey, keyToFace, layers } = e.data;

    if (!layers || !faceToKey || !keyToFace) return;

    const typedKeyToFace = keyToFace.map(
      (arr: number[]) => new Int32Array(arr),
    );

    const typedFaceToKey = faceToKey.map(
      (arr: number[]) => new Int32Array(arr),
    );

    this.createChunk(traceX, traceY, typedFaceToKey, typedKeyToFace, layers);
  }

  callBackChunkBlock(
    e: { data: ChunkBlockGenData },
    traceX: number,
    traceY: number,
  ): void {
    const { blocks } = e.data;
    const key = `${traceX}:${traceY}`;

    if (!blocks || !key) return;

    const blockArrays = blocks.map((a: number[]) => new Uint8Array(a));

    this.chunkMan.setValueBlocksMap(key, blockArrays);
  }

  createChunk(
    traceX: number,
    traceY: number,
    faceToKey: Int32Array[],
    keyToFace: Int32Array[],
    layers: ChunkLayer[],
  ) {
    const positionNumComponents = 3;
    const normalNumComponents = 3;

    const key = `${traceX}:${traceY}`;
    const layerMeshs = [];
    const bvhs = [];

    const meshsMemorys = this.chunkMan.getChunkMeshMap().get(key);
    const isMeshsInMemory = meshsMemorys && meshsMemorys.length > 0;

    if (isMeshsInMemory && meshsMemorys[0].visible === false) {
      meshsMemorys.forEach((mesh) => {
        const material = mesh.material as THREE.MeshLambertMaterial;

        material.transparent = true;
        material.opacity = 0;

        mesh.userData.revealStart = performance.now();

        mesh.visible = true;

        this.revealingChunks.add(mesh);
      });

      return;
    }

    const blockData = this.chunkMan.getChunkBlocksMap().get(key);

    if (!blockData) {
      return;
    }

    for (let c = 0; c < layers.length; c++) {
      const layer = layers[c];
      const layerBlockData = blockData[c];

      const positions = layer.positions;
      const normals = layer.normals;
      const indices = layer.indices;
      const bvhSerialized = layer.serializedBVH;

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(positions),
          positionNumComponents,
        ),
      );

      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(
          new Float32Array(normals),
          normalNumComponents,
        ),
      );

      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

      const indexAttr = geometry.getIndex()!;
      const originalIndexMap: number[][] = [];

      for (let i = 0; i < indexAttr.count; i += 3) {
        originalIndexMap.push([
          indexAttr.getX(i),
          indexAttr.getX(i + 1),
          indexAttr.getX(i + 2),
        ]);
      }

      const bvh = MeshBVH.deserialize(bvhSerialized, geometry);

      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      const newIndexAttr = geometry.getIndex()!;
      const reorderedIndexMap: number[][] = [];

      for (let i = 0; i < newIndexAttr.count; i += 3) {
        reorderedIndexMap.push([
          newIndexAttr.getX(i),
          newIndexAttr.getX(i + 1),
          newIndexAttr.getX(i + 2),
        ]);
      }

      const remap = remapMeshIndex(originalIndexMap, reorderedIndexMap);

      const userData: ChunkUserData = {
        key: key,
        layerLevel: c,
        traceX: traceX,
        traceY: traceY,
        faceToKey: faceToKey[c],
        keyToFace: keyToFace[c],
        remapFaceIndex: remap,
        layers: layers,
      };

      let mesh: THREE.Mesh;

      if (isMeshsInMemory) {
        mesh = meshsMemorys[c];
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.userData = userData;
      } else {
        const material = this.material.clone();

        material.transparent = true;
        material.opacity = 0;

        mesh = new THREE.Mesh(geometry, material);

        mesh.userData = userData;
        mesh.userData.revealStart = performance.now();
        mesh.userData = userData;
        mesh.userData.hash = hashUint8Array(layerBlockData);
        this.revealingChunks.add(mesh);
      }

      bvhs.push({
        bhv: bvh,
        matrix: mesh.matrixWorld,
      });

      layerMeshs.push(mesh);
    }

    this.chunkMan.setValueMeshMap(key, layerMeshs);
    this.chunkMan.setValueColliderMap(key, bvhs);

    if (!isMeshsInMemory) {
      layerMeshs.forEach((l) => this.add(l));
    }
  }

  updateChunkReveal() {
    const now = performance.now();
    const duration = 300;

    for (const mesh of this.revealingChunks) {
      const material = mesh.material as THREE.MeshLambertMaterial;

      let progress = (now - mesh.userData.revealStart) / duration;

      progress = Math.min(progress, 1);

      const eased = progress * progress * (3 - 2 * progress);

      material.opacity = eased;

      if (progress >= 1) {
        material.opacity = 1;
        material.transparent = false;

        this.revealingChunks.delete(mesh);
      }
    }
  }

  updateChunkFadeOut() {
    const now = performance.now();
    const duration = 300;

    for (const [chunkKey, fade] of this.fadingOutChunks) {
      let progress = (now - fade.start) / duration;

      progress = Math.min(progress, 1);

      const eased = 1 - progress * progress * (3 - 2 * progress);

      fade.meshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshLambertMaterial;

        material.opacity = eased;
      });

      if (progress < 1) {
        continue;
      }

      fade.meshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshLambertMaterial;

        material.opacity = 0;

        if (fade.dispose) {
          mesh.removeFromParent();
          mesh.geometry.dispose();
        } else {
          mesh.visible = false;
        }
      });

      if (fade.dispose) {
        this.chunkMan.deleteValueChunkMan(chunkKey);
      }

      this.fadingOutChunks.delete(chunkKey);

      fade.resolve();
    }
  }

  async generateWorld(type: ChunkMsgTypes, chunksToRender: string[]) {
    if (!this.chunkQt) return;

    const promises: Promise<void>[] = [];

    chunksToRender.forEach((key) => {
      promises.push(this.generatePromise(key, type));
    });

    await Promise.all(promises);
  }

  generatePromise(key: string, type: ChunkMsgTypes) {
    const [x, y] = key.split(":");

    return this.generateChunk(Number(x), Number(y), type);
  }

  getChunksToRender(playerPosition: Vector3): {
    all: string[];
    generateBlockAndMesh: string[];
    generateOnlyMesh: string[];
  } | null {
    const chuncks = this.getChunksToGenerate(playerPosition);

    if (chuncks?.innerKeys == null || chuncks?.borderKeys == null) return null;

    const keys = [...chuncks.innerKeys, ...chuncks.borderKeys];

    const filtereds = keys.filter(
      (key) => !this.chunkMan.getChunkMeshMap().has(key),
    );
    const generateOnlyMesh = keys.filter((key) => {
      const meshs = this.chunkMan.getChunkMeshMap().get(key);
      if (meshs && meshs[0].visible == false) {
        return true;
      }
      return false;
    });

    return {
      all: keys,
      generateBlockAndMesh: filtereds.filter(
        (c) => !generateOnlyMesh.includes(c),
      ),
      generateOnlyMesh: generateOnlyMesh,
    };
  }

  getChunksToRemove(meshsToGenerate: string[]) {
    return Array.from(this.chunkMan.getChunkMeshMap().keys()).filter(
      (key) => !meshsToGenerate.includes(key),
    );
  }

  getPlayerChunkPosition(playerLocation: Vector3) {
    const chunkX = Math.floor(playerLocation.x / CHUNK_SIZE) * CHUNK_SIZE;

    const chunkY = Math.floor(playerLocation.z / CHUNK_SIZE) * CHUNK_SIZE;

    return { chunkX, chunkY };
  }

  dropChuncks(chuncksToRemove: string[]): Promise<void> {
    const promises: Promise<void>[] = [];

    chuncksToRemove.forEach((chunkKey) => {
      const layers = this.chunkMan.getChunkMeshMap().get(chunkKey);

      const blockData = this.chunkMan.getChunkBlocksMap().get(chunkKey);

      if (!blockData || !layers) {
        return;
      }

      let isChunckIntact = true;

      for (let i = 0; i < layers.length; i++) {
        const currentHash = hashUint8Array(blockData[i]);

        const currentLayer = layers[i];

        if (currentHash !== currentLayer.userData.hash) {
          isChunckIntact = false;
          break;
        }
      }

      if (this.fadingOutChunks.has(chunkKey)) {
        return;
      }

      const promise = new Promise<void>((resolve) => {
        const start = performance.now();

        layers.forEach((mesh) => {
          const material = mesh.material as THREE.MeshLambertMaterial;

          material.transparent = true;
          material.opacity = 1;
        });

        this.fadingOutChunks.set(chunkKey, {
          meshes: layers,
          start,
          dispose: isChunckIntact,
          resolve,
        });
      });

      promises.push(promise);
    });

    return Promise.all(promises).then(() => {});
  }

  getChunksToGenerate(playerLocation: Vector3) {
    if (this.player == null || this.chunkQt == null) return;

    const { chunkX, chunkY } = this.getPlayerChunkPosition(playerLocation);

    if (
      this.player.currentChunkKey?.traceX === chunkX &&
      this.player.currentChunkKey?.traceY === chunkY
    ) {
      return;
    }

    return getChunksKeysToRender(chunkX, chunkY, this.chunkQt);
  }

  setupLights() {
    const light1 = new THREE.DirectionalLight();
    light1.position.set(1, 1, 1);
    this.add(light1);

    const light2 = new THREE.DirectionalLight();
    light2.position.set(-1, 1, 0.5);
    this.add(light2);

    const ambiente = new THREE.AmbientLight();
    ambiente.intensity = 0.1;
    this.add(ambiente);
  }
}
