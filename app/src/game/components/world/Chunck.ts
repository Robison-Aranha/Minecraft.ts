import * as THREE from "three";
import { createOctaveNoise2D } from "./NoiseFunction";
import { Block } from "./interfaces";

interface Face {
  dir: Array<number>;
  corners: Array<Array<number>>;
}

interface indexBlock {
  blocks: Array<any>;
}


interface Data {
  positions?: Array<number>;
  normals?: Array<number>;
  indices?: Array<number>;
}

export class Chunck extends THREE.Group {
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
    scale: 100
  });
  private baseHeight = 200;
  private positions: Array<number> | undefined;
  private normals: Array<number> | undefined;
  private indices: Array<number> | undefined;
  private isUnderZeroX: boolean | undefined;
  private isUnderZeroY: boolean | undefined;
  private indexBlocks: Map<String, Block> = new Map();
  private faces: Face[] = [
    {
      dir: [- 1, 0, 0,],
      corners: [
        [0, 1, 0],
        [0, 0, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    },
    {
      dir: [1, 0, 0,],
      corners: [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
        [1, 0, 0],
      ],
    },
    {
      dir: [0, - 1, 0,],
      corners: [
        [1, 0, 1],
        [0, 0, 1],
        [1, 0, 0],
        [0, 0, 0],
      ],
    },
    {
      dir: [0, 1, 0,],
      corners: [
        [0, 1, 1],
        [1, 1, 1],
        [0, 1, 0],
        [1, 1, 0],
      ],
    },
    {
      dir: [0, 0, - 1,],
      corners: [
        [1, 0, 0],
        [0, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    },
    {
      dir: [0, 0, 1,],
      corners: [
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ],
    },
  ];

  constructor(width: number, height: number, traceX: number, traceY: number) {
    super();
    this.width = width;
    this.height = height;
    this.traceX = traceX;
    this.traceY = traceY;
    this.limitX = this.traceX >= 0 ? this.width + this.traceX : this.traceX - this.traceX;
    this.isUnderZeroX = this.limitX < 0;
    this.limitY = this.traceY >= 0 ? this.width + this.traceY : this.traceY - this.traceY;
    this.isUnderZeroY = this.limitY < 0;
  }

  generateChunck() {
    this.positions = [];
    this.normals = [];8
    this.indices = [];
    for (let x = this.traceX; x < this.limitX; this.isUnderZeroX ? x-- : x++) {
      for (let z = 0; z < this.height; z++) {
        for (let y = this.traceY; y < this.limitY; this.isUnderZeroY ? y-- : y++) {
          if (this.getBlock(x, z, y)) {
            this.indexBlocks.set(JSON.stringify([x, z, y]), {x:x, z:z, y:y});
            for (const { dir, corners } of this.faces) {
              const neighbor = this.getBlock(
                x + dir[0],
                z + dir[1],
                y + dir[2]);
              if (!neighbor) {
                const ndx = this.positions.length / 3;
                for (const pos of corners) {
                  this.positions.push(pos[0] + x, pos[1] + z, pos[2] + y);
                  this.normals.push(...dir);
                }
                this.indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3,
                );
              }
            }
          }
        }
      }
    }
  }

  getData(): Data {
    return { positions: this.positions, normals: this.normals, indices: this.indices };
  }

  getBlockIndex(): indexBlock {
    return { blocks: Array.from(this.indexBlocks.entries()) };
  }

  getBlock(x: number, z: number, y: number): boolean {
    const surface = this.baseHeight + this.noise(x, y) * 35;
    return z < surface;
  }
}
