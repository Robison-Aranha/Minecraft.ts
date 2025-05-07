import * as THREE from "three";
import { Block } from "./interfaces";

interface Size {
  width: number;
  height: number;
}

export class World extends THREE.Group {
  private size: Size = { width: 100, height: 328 };
  private chunckQt: number | null;
  private indexBlocks = new Map<String, Block>();
  private material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial({
    color: "gray",
  });

  constructor(chunckQt: number) {
    super();
    this.chunckQt = chunckQt;
  }

  generateChunck(traceX: number, traceY: number) {
    const worker = new Worker(new URL("./ChunckWorker.ts", import.meta.url), {
      type: "module",
    });

    worker.postMessage({
      width: this.size.width,
      height: this.size.height,
      traceX: traceX,
      traceY: traceY
    });

    worker.onmessage = (e) => {
      const { positions, normals, indices, blocks } = e.data;
      this.createChunck(positions, normals, indices);
      Object.assign(this.indexBlocks, new Map(blocks));
      worker.terminate();
    };
  }

  createChunck(
    positions: Array<number>,
    normals: Array<number>,
    indices: Array<number>
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
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, this.material);
    this.add(mesh);
  }

  generateWorld() {
    if (this.chunckQt) {
      this.generateChunck(0, 0);
      for (let r = 1; r <= this.chunckQt; r++) {
        const valueGen = r * this.size.width;
        this.generateChunck(valueGen, 0);
        this.generateChunck(valueGen * -1, 0);
        this.generateChunck(0, valueGen);
        this.generateChunck(0, valueGen * -1);
        for (let h = 1; h <= this.chunckQt; h++) {
          const valuePre = h * this.size.width;
          this.generateChunck(valueGen, valuePre);
          this.generateChunck(valueGen, valuePre * -1);
          this.generateChunck(valueGen * -1, valuePre);
          this.generateChunck(valuePre * -1, valueGen * -1);
        }
      }
    }
  }

  getIndexBlocks(): Map<String, Block> {
    return this.indexBlocks;
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
