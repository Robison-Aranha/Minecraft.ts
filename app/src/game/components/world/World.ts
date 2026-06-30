import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import {
  ChunkBlockGenData,
  ChunkLayer,
  ChunkMeshGenData,
} from "../interfaces/ChunkGenData";
import { getChunksKeysToRender, getNearChunksKeysGen, remapMeshIndex} from "../utils/Utils";
import { ChunkUserData } from "../interfaces/ChunkUserData";
import { createWorker } from "../workers/WorkerFac";
import { WorkerPaths } from "../workers/WorkerFac";
import { ChunkMsgTypes } from "../enums/ChunkMsgTypes.ts";
import { ChunkMan } from "./ChunkMan.ts";
import {Player} from "../player/Player.ts";
import {Vector3} from "three";

export class World extends THREE.Group {
  private chunkQt: number | null;
  private material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({
    color: "gray",
  });
  private seed: number | undefined;
  private chunkMan = new ChunkMan();
  private player: Player | undefined;

  constructor(chunkQt: number) {
    super();
    this.chunkQt = chunkQt;
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
    return new Promise((resolve, reject) => {
      const worker = createWorker(WorkerPaths.CHUNK_GENERATION);

      let neighbourChunks: (Uint8Array[] | undefined)[] = [];
      let currentChunk: Uint8Array[] = [];

      if (type == ChunkMsgTypes.GEN_MESH) {
        neighbourChunks = this.getNeighbourChunks(traceX, traceY);
        currentChunk =
          this.chunkMan.getChunkBlocksMap().get(`${traceX}:${traceY}`) ?? [];
      }

      const stringifiedCurrentChunk = JSON.stringify(
        currentChunk.map((layer) => Array.from(layer)),
      );
      const stringifiedNeigbours = JSON.stringify(
          neighbourChunks.map((n) => (n ? n.map((c) => Array.from(c)) : [])),
      );

      worker.postMessage({
        traceX,
        traceY,
        seed: this.seed,
        type,
        blockData: stringifiedCurrentChunk,
        neighbourChunks: stringifiedNeigbours,
      });

      worker.onmessage = (event: unknown) => {
        if (type === ChunkMsgTypes.GEN_BLOCK) {
          this.callBackChunkBlock(
            event as { data: ChunkBlockGenData },
            traceX,
            traceY,
          );
        } else {
          this.callBackChunkMesh(
            event as { data: ChunkMeshGenData },
            traceX,
            traceY,
          );
        }

        worker.terminate();
        resolve();
      };

      worker.onerror = (err: unknown) => {
        worker.terminate();
        reject(err);
      };
    });
  }

  getNeighbourChunks(
    traceX: number,
    traceY: number,
  ): (Uint8Array[] | undefined)[] {
    const chunkNeighbours = getNearChunksKeysGen(traceX, traceY);
    return chunkNeighbours.map((c) =>
      this.chunkMan.getChunkBlocksMap().get(c),
    );
  }

  callBackChunkMesh(
    e: { data: ChunkMeshGenData },
    traceX: number,
    traceY: number,
  ): void {
    const { faceToKey, keyToFace, layers } = e.data;

    if (!layers || !faceToKey || !keyToFace) return;

    const keyToFaceArrayParsed = JSON.parse(keyToFace);
    const typedKeyToFace = keyToFaceArrayParsed.map(
      (arr: number[]) => new Int32Array(arr),
    );

    const faceToKeyArrayParse = JSON.parse(faceToKey);
    const typedFaceToKey = faceToKeyArrayParse.map(
      (arr: number[]) => new Int32Array(arr),
    );

    const layersArray = JSON.parse(layers);

    this.createChunk(
      traceX,
      traceY,
      typedFaceToKey,
      typedKeyToFace,
      layersArray,
    );
  }

  callBackChunkBlock(
    e: { data: ChunkBlockGenData },
    traceX: number,
    traceY: number,
  ): void {
    const { blocks } = e.data;
    const key = `${traceX}:${traceY}`;

    if (!blocks || !key) return;

    const parsedArrays = JSON.parse(blocks);
    const blockArrays = parsedArrays.map((a: number[]) => new Uint8Array(a));

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

    for (let c = 0; c < layers.length; c++) {
      const layer = layers[c];
      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(layer.positions),
          positionNumComponents,
        ),
      );

      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(
          new Float32Array(layer.normals),
          normalNumComponents,
        ),
      );

      geometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(layer.indices), 1),
      );

      const indexAttr = geometry.getIndex()!;
      const originalIndexMap: number[][] = [];

      for (let i = 0; i < indexAttr.count; i += 3) {
        originalIndexMap.push([
          indexAttr.getX(i),
          indexAttr.getX(i + 1),
          indexAttr.getX(i + 2),
        ]);
      }

      const mesh = new THREE.Mesh(geometry, this.material);

      const bvh = new MeshBVH(geometry);

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

      mesh.userData = userData;

      bvhs.push({
        bhv: bvh,
        matrix: mesh.matrixWorld,
      });

      layerMeshs.push(mesh);
    }

    this.chunkMan.setValueMeshMap(key, layerMeshs);
    this.chunkMan.setValueColliderMap(key, bvhs);

    layerMeshs.forEach((l) => this.add(l));
  }


  async generateWorld(type: ChunkMsgTypes, playerPosition: Vector3) {
    if (!this.chunkQt) return;

    const promises: Promise<void>[] = [];

    const chuncks = this.getChunksToGenerate(playerPosition);

    if (chuncks?.innerKeys == null || chuncks?.borderKeys == null) return;

    const keys = [...chuncks.borderKeys, ...chuncks.innerKeys];

    console.log(keys)

    keys.forEach(key => {
      promises.push(
         this.generatePromise(key, type));
    });

    await Promise.all(promises);
  }

  generatePromise(key: string, type: ChunkMsgTypes) {
    const [x, y] = key.split(':');

    return this.generateChunk(
            Number(x),
            Number(y),
            type
        );
  }

  getChunksToGenerate(playerLocation: Vector3) {
    if (this.player == null || this.chunkQt == null) return;

    return getChunksKeysToRender(playerLocation.x, playerLocation.y , this.chunkQt)
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
