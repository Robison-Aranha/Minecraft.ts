import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { ChunckGenData } from "../interfaces/ChunckGenData";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "../const/const";
import { remapMeshIndex } from "../utils/Utils";
import { BlockData } from "../interfaces/ChunckData";
import { ChunckUserData } from "../interfaces/ChunckUserData";

interface Collider {
  matrix: THREE.Matrix4;
  bhv: MeshBVH;
}

export class World extends THREE.Group {
  private chunckQt: number | null;
  private collider: Map<string, Collider> = new Map();
  private material: THREE.MeshLambertMaterial =
    new THREE.MeshLambertMaterial({ color: "gray" });
  private seed: number | undefined;
  private chunckManager = new Worker(new URL("../world/ChunckManager.worker.ts", import.meta.url), {
    type: "module",
  });

  constructor(chunckQt: number) {
    super();
    this.chunckQt = chunckQt;
  }

  setSeed(seed: number) {
    this.seed = seed;
  }

  getCollider(): Map<string, Collider> {
    return this.collider;
  }

  generateChunck(traceX: number, traceY: number) {
    const worker = new Worker(new URL("./Chunck.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.postMessage({
      width: CHUNK_SIZE,
      height: CHUNK_HEIGHT,
      traceX: traceX,
      traceY: traceY,
      seed: this.seed
    });

    worker.onmessage = (e: { data: ChunckGenData }) => {
      const { positions, normals, indices, faceToKey, keyToFace, blockData } = e.data;

      if (!positions || !normals || !indices || !faceToKey || !keyToFace || !blockData)
        return null;

      const pos = JSON.parse(positions);
      const nor = JSON.parse(normals);
      const ind = JSON.parse(indices);
      const keyToFaceArray = JSON.parse(keyToFace);
      const faceToKeyArray = JSON.parse(faceToKey);
      const blockDataArray = JSON.parse(blockData)

      this.createChunck(
        pos,
        nor,
        ind,
        traceX,
        traceY,
        new Map(faceToKeyArray),
        new Map(keyToFaceArray),
        new Map(blockDataArray)
      );

      worker.terminate();
    };
  }

  createChunck(
    positions: number[],
    normals: number[],
    indices: number[],
    traceX: number,
    traceY: number,
    faceToKey: Map<number, string>,
    keyToFace: Map<string, number[]>,
    blockData: Map<string, BlockData>
  ) {
    const positionNumComponents = 3;
    const normalNumComponents = 3;

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(positions),
        positionNumComponents
      )
    );

    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
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

    const userData: ChunckUserData = {
      traceX: traceX,
      traceY: traceY,
      faceToKey: faceToKey,
      keyToFace: keyToFace,
      addedBlocks: new Set<string>(),
      removedBlocks: new Set<string>(),
      blockData: blockData,
      remapFaceIndex: remap,
    }

    const key = `${traceX}${traceY}`;

    this.collider.set(key, {
      bhv: bvh,
      matrix: mesh.matrixWorld,
    });
    this.saveChunck(userData)
    this.add(mesh);
  }

  saveChunck(userData: any) {
    this.chunckManager.postMessage({
      ...userData
    })
  }

  generateWorld() {
    if (this.chunckQt) {
      this.generateChunck(0, 0);

      for (let r = 1; r <= this.chunckQt; r++) {
        const valueGen = r * CHUNK_SIZE;

         this.generateChunck(valueGen, 0);
         this.generateChunck(valueGen * -1, 0);
         this.generateChunck(0, valueGen);
         this.generateChunck(0, valueGen * -1);

        for (let h = 1; h <= this.chunckQt; h++) {
          const valuePre = h * CHUNK_SIZE;

          this.generateChunck(valueGen, valuePre);
          this.generateChunck(valueGen, valuePre * -1);
          this.generateChunck(valueGen * -1, valuePre);
          this.generateChunck(valuePre * -1, valueGen * -1);
        }
      }
    }
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