import { ChunckData } from "../interfaces/ChunckData";
import { createOctaveNoise2D } from "./NoiseFunction";

interface Face {
  dir: Array<number>;
  corners: Array<Array<number>>;
}

interface FaceObj {
  left: Face;
  right: Face;
  bottom: Face;
  top: Face;
  back: Face;
  front: Face;
}

interface ChunckOptions {
  width?: number;
  height?: number;
  traceX?: number;
  traceY?: number;
  addedBlocks?: Set<string>;
  removedBlocks?: Set<string>;
  positions?: number[];
  indices?: number[];
  normals?: number[];
}

export class Chunck {
  private width: number;
  private height: number;
  private traceX: number;
  private traceY: number;
  private limitX: number;
  private limitY: number;
  private noise = createOctaveNoise2D({
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    scale: 100,
  });
  private addedBlocks;
  private removedBlocks;
  private faceToKey: Map<number, string> = new Map();
  private keyToFace: Map<string, number[]> = new Map();
  private baseHeight = 200;
  private positions: number[];
  private normals: number[];
  private indices: number[];
  private faces: FaceObj = {
    left: {
      dir: [-1, 0, 0],
      corners: [
        [0, 1, 0],
        [0, 0, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    },
    right: {
      dir: [1, 0, 0],
      corners: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
        [1, 0, 0],
      ],
    },
    bottom: {
      dir: [0, -1, 0],
      corners: [
        [1, 0, 1],
        [0, 0, 1],
        [1, 0, 0],
        [0, 0, 0],
      ],
    },
    top: {
      dir: [0, 1, 0],
      corners: [
        [0, 1, 1],
        [1, 1, 1],
        [0, 1, 0],
        [1, 1, 0],
      ],
    },
    back: {
      dir: [0, 0, -1],
      corners: [
        [1, 0, 0],
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
    front: {
      dir: [0, 0, 1],
      corners: [
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ],
    },
  };

  constructor(options: ChunckOptions) {
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.traceX = options.traceX ?? 0;
    this.traceY = options.traceY ?? 0;

    this.limitX =
      this.traceX >= 0 ? this.width + this.traceX : this.traceX + this.width;

    this.limitY =
      this.traceY >= 0 ? this.width + this.traceY : this.traceY + this.width;

    this.addedBlocks = options.addedBlocks ?? new Set<string>();
    this.removedBlocks = options.removedBlocks ?? new Set<string>();

    this.positions = options.positions ?? [];
    this.normals = options.normals ?? [];
    this.indices = options.indices ?? [];
  }

  generateChunck() {
    for (let x = this.traceX; x < this.limitX; x++) {
      for (let z = 0; z < this.height; z++) {
        for (
          let y = this.traceY;
          y < this.limitY;
          y++
        ) {
          const keyMap = `${x},${z},${y}`;
          if (this.placeBlock(x, z, y, keyMap)) {
            this.getFaceToBlockDirection({ x: x, z: z, y: y}, keyMap);
          }
        }
      }
    }
  }

  getFaceToBlockDirection(
    location: { x: number; z: number; y: number },
    keyMap: string
  ) {
    if (!this.positions || !this.normals || !this.indices) return;

    const faceKeys = [];
    
    for (const key of Object.keys(this.faces) as (keyof FaceObj)[]) {
      const { corners, dir } = this.faces[key];

      const nestX = location.x + dir[0];
      const nestZ = location.z + dir[1];
      const nestY = location.y + dir[2];

      const neighbor = this.placeBlock(
        nestX,
        nestZ,
        nestY,
        `${nestX},${nestZ},${nestY}`
      );

      if (!neighbor) {
        const ndx = this.positions.length / 3;
        this.indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
        for (const pos of corners) {
          this.positions.push(
            pos[0] + location.x,
            pos[1] + location.z,
            pos[2] + location.y
          );
          this.normals.push(...dir);
        }
        const newNdx = this.indices.length / 3;
        this.faceToKey.set(newNdx - 2, keyMap);
        this.faceToKey.set(newNdx - 1, keyMap);
        faceKeys.push(newNdx - 2, newNdx - 1);
      }
    }

    if (faceKeys.length > 0) {
      this.keyToFace.set(keyMap, faceKeys);
    }
  }

  placeBlock(
    x: number,
    z: number,
    y: number,
    keyMap: string,
  ) {
    const naturalPlace = this.getBlock(x, z, y);
    if ((naturalPlace || this.addedBlocks.has(keyMap)) && !this.removedBlocks.has(keyMap)) {
      return true;
    }
    return false;
  }

  getData(): ChunckData {
    return {
      positions: JSON.stringify(this.positions),
      normals: JSON.stringify(this.normals),
      indices: JSON.stringify(this.indices),
      faceToKey: JSON.stringify([...this.faceToKey]),
      keyToFace: JSON.stringify([...this.keyToFace]),
      meshId: ""
    };
  }

  getBlock(x: number, z: number, y: number): boolean {
    const surface = this.baseHeight + this.noise(x, y) * 35;
    return z < surface;
  }
}
