import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { ChunckBlockGenData, ChunckLayer, ChunckMeshGenData } from "../interfaces/ChunckGenData";
import { CHUNK_TOTAL_HEIGHT, CHUNK_SIZE } from "../const/const";
import { remapMeshIndex } from "../utils/Utils";
import { ChunckUserData } from "../interfaces/ChunckUserData";
import { createWorker } from "../workers/worker-factory/WorkerFac";
import { WorkerPaths } from "../workers/worker-factory/WorkerFac";
import { ChunckMsgTypes } from "../enums/ChunckMsgTypes";
import { ChunckMan } from "./ChunckMan";
import { BlockType } from "../enums/BlockType";


export class World extends THREE.Group {
  private chunckQt: number | null;
  private material: THREE.MeshLambertMaterial =
    new THREE.MeshLambertMaterial({ color: "gray" });
  private seed: number | undefined;
  private chunckMan = new ChunckMan()

  constructor(chunckQt: number) {
    super();
    this.chunckQt = chunckQt;
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  getSeed() {
    return this.seed;
  }

  getChunckMan() {
    return this.chunckMan;
  }

  generateChunck(
    traceX: number,
    traceY: number,
    type: ChunckMsgTypes
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = createWorker(WorkerPaths.CHUNCK_GENERATION);

      let neigbourChuncks: (Map<string, BlockType>[] | undefined)[] = [];
      let currentChunck : Map<string, BlockType>[] | [] = [];

      if (type == ChunckMsgTypes.GEN_MESH) {
        neigbourChuncks = this.getNeighbourChuncks(traceX, traceY);
        currentChunck = this.chunckMan.getChunckBlocksMap().get(`${traceX}:${traceY}`) ?? [];
      }

      worker.postMessage({
        width: CHUNK_SIZE,
        height: CHUNK_TOTAL_HEIGHT,
        traceX,
        traceY,
        seed: this.seed,
        type,
        blockData: JSON.stringify(currentChunck.map(n => n && JSON.stringify([...n]))),
        neigbourChuncks: JSON.stringify(neigbourChuncks.map(n => n?.map(c => JSON.stringify([...c]))))
      });

      worker.onmessage = (event: any) => {
        if (type === ChunckMsgTypes.GEN_BLOCK) {
          this.callBackChunckBlock(event, traceX, traceY);
        } else {
          this.callBackChunckMesh(event, traceX, traceY);
        }

        worker.terminate(); 
        resolve();
      };

      worker.onerror = (err: any) => {
        worker.terminate();
        reject(err);
      };
    });
  }

  getNeighbourChuncks(traceX: number, traceY: number): (Map<string, BlockType>[] | undefined)[] {
    const chunckNeighbours = this.getNearChuncksKeysGen(traceX, traceY);

    return chunckNeighbours.map(c => this.chunckMan.getChunckBlocksMap().get(c));
  }


  callBackChunckMesh(e: { data: ChunckMeshGenData}, traceX: number, traceY: number): void {
    const { positions, normals, indices, faceToKey, keyToFace, layers } = e.data;

    if (!positions || !normals || !indices || !layers || !faceToKey || !keyToFace)
      return;

  
    const pos = JSON.parse(positions);
    const nor = JSON.parse(normals);
    const ind = JSON.parse(indices);
    const keyToFaceArray = JSON.parse(keyToFace);
    const faceToKeyArray = JSON.parse(faceToKey);
    const layersArray = JSON.parse(layers)

    this.createChunck(
      pos,
      nor,
      ind,
      traceX,
      traceY,
      new Map(faceToKeyArray),
      new Map(keyToFaceArray),
      layersArray
    );
  };

  callBackChunckBlock(e: { data: ChunckBlockGenData }, traceX: number, traceY: number): void {
    const { blocks } = e.data;

    const key = `${traceX}:${traceY}`

    if (!blocks || !key) {
      return;
    }

    const parsedArrays = JSON.parse(blocks)

    const blockMaps = parsedArrays.map((a: string) => new Map(JSON.parse(a)));

    this.chunckMan.setValueBlocksMap(key, blockMaps)
  };

  createChunck(
    positions: number[],
    normals: number[],
    indices: number[],
    traceX: number,
    traceY: number,
    faceToKey: Map<number, string>,
    keyToFace: Map<string, number[]>,
    layers: ChunckLayer[]
  ) {
    const positionNumComponents = 3;
    const normalNumComponents = 3;

    const key = `${traceX}:${traceY}`;
    const layerMeshs = [];

    for (let c = 0; c < layers.length; c++) {

      const layer = layers[c];

      const geometry = new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(layer.positions),
          positionNumComponents
        )
      );

      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(new Float32Array(layer.normals), normalNumComponents)
      );

      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(layer.indices), 1));

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

      const userData: ChunckUserData = {
        key: key,
        layerLevel: c,
        traceX: traceX,
        traceY: traceY,
        faceToKey: faceToKey,
        keyToFace: keyToFace,
        remapFaceIndex: remap,
        layers: layers
      }

      mesh.userData = userData;

      layerMeshs.push(mesh);
    }

    const totalGeometry = new THREE.BufferGeometry();

    totalGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          new Float32Array(positions),
          positionNumComponents
        )
      );

    totalGeometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
      );

    totalGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

    const bvh = new MeshBVH(totalGeometry);

    this.chunckMan.setValueMeshMap(key, layerMeshs);

    this.chunckMan.setValueColliderMap(key, {
      bhv: bvh,
      matrix: (new THREE.Mesh(totalGeometry, this.material)).matrixWorld,
    });

    layerMeshs.forEach(l => this.add(l));
  }


  getNearChuncksKeysCollider(traceX: number, traceY: number) {
     return [
    `${traceX}:${traceY}`,
    `${traceX + CHUNK_SIZE}:${traceY}`, 
    `${traceX + CHUNK_SIZE}:${traceY + CHUNK_SIZE}`, 
    `${traceX + CHUNK_SIZE}:${traceY - CHUNK_SIZE}`, 
    `${traceX - CHUNK_SIZE}:${traceY}`, 
    `${traceX - CHUNK_SIZE}:${traceY - CHUNK_SIZE}`, 
    `${traceX - CHUNK_SIZE}:${traceY + CHUNK_SIZE}`, 
    `${traceX}:${traceY + CHUNK_SIZE}`, 
    `${traceX}:${traceY - CHUNK_SIZE}`]
  }

   getNearChuncksKeysGen(traceX: number, traceY: number) {
     return [
    `${traceX + CHUNK_SIZE}:${traceY}`, 
    `${traceX - CHUNK_SIZE}:${traceY}`, 
    `${traceX}:${traceY + CHUNK_SIZE}`, 
    `${traceX}:${traceY - CHUNK_SIZE}`]
  }

 async generateWorld(type: ChunckMsgTypes) {
    if (!this.chunckQt) return;

    const promises: Promise<void>[] = [];

    promises.push(
      this.generateChunck(0, 0, type)
    );

    for (let r = 1; r <= this.chunckQt; r++) {
      const valueGen = r * CHUNK_SIZE;

      promises.push(
        this.generateChunck(valueGen, 0, type),
        this.generateChunck(-valueGen, 0, type),
        this.generateChunck(0, valueGen, type),
        this.generateChunck(0, -valueGen, type)
      );

      for (let h = 1; h <= this.chunckQt; h++) {
        const valuePre = h * CHUNK_SIZE;

        promises.push(
          this.generateChunck(valueGen, valuePre, type),
          this.generateChunck(valueGen, -valuePre, type),
          this.generateChunck(-valueGen, valuePre, type),
          this.generateChunck(-valueGen, -valuePre, type)
        );
      }
    }

    await Promise.all(promises);
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