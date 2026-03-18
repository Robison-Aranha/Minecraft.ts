import { CHUNK_LAYER_HEIGHT, CHUNK_SIZE, CHUNK_TOTAL_HEIGHT } from "../const/Const";
import { BlockType } from "../enums/BlockType";
import { ChunckBlockGenData, ChunckLayer, ChunckMeshGenData } from "../interfaces/ChunckGenData";
import { mulberry32 } from "../utils/Utils";
import { createOctaveNoise2D } from "./NoiseFunction";
import { createNoise2D } from "simplex-noise";

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
  seed: number;
  blockData: string;
  neigbourChuncks: string;
}

const MAX_TRIANGLES_PER_BLOCK = 12;

export class ChunckGen {
  private width: number = CHUNK_SIZE;
  private height: number = CHUNK_TOTAL_HEIGHT;
  private traceX: number;
  private traceY: number;
  private limitX: number;
  private limitY: number;
  private noise;
  private neigbourChuncks: Uint8Array[][];
  private blockData: Uint8Array[];
  private blockDataByLayer: Uint8Array[] = [];
  private faceToBlock: Int32Array[] = [];
  private blockToFace: Int32Array[] = [];
  private blockFaceCounts: Uint8Array[] = [];
  private baseHeight = 200;
  private layers: ChunckLayer[] = [];

  private faces: FaceObj = {
    left: { dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] },
    right: { dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] },
    bottom: { dir: [0, -1, 0], corners: [[1, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 0]] },
    top: { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
    back: { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
    front: { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
  };

  constructor(options: ChunckOptions) {
    this.traceX = options.traceX ?? 0;
    this.traceY = options.traceY ?? 0;
    this.limitX = this.traceX >= 0 ? this.width + this.traceX : this.traceX + this.width;
    this.limitY = this.traceY >= 0 ? this.width + this.traceY : this.traceY + this.width;

    const parsedNeighbours: number[][][] = JSON.parse(options.neigbourChuncks);
    this.neigbourChuncks = parsedNeighbours.map(n => n ? n.map(c => new Uint8Array(c)) : []);

    const parsedBlockData: number[][] = JSON.parse(options.blockData);
    this.blockData = parsedBlockData.map(b => new Uint8Array(b));

    this.noise = createOctaveNoise2D({
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
      scale: 100,
    }, createNoise2D(mulberry32(options.seed)));

    const totalLayers = Math.ceil(this.height / CHUNK_LAYER_HEIGHT);
    const volumePerLayer = this.width * this.width * CHUNK_LAYER_HEIGHT;

    for (let i = 0; i < totalLayers; i++) {
      this.layers.push({ positions: [], normals: [], indices: [] });
      this.blockDataByLayer.push(new Uint8Array(volumePerLayer));

      const maxTrianglesInLayer = volumePerLayer * MAX_TRIANGLES_PER_BLOCK;
      this.faceToBlock.push(new Int32Array(maxTrianglesInLayer).fill(-1));
      this.blockToFace.push(new Int32Array(maxTrianglesInLayer).fill(-1));
      this.blockFaceCounts.push(new Uint8Array(volumePerLayer));
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    const localX = ((x % this.width) + this.width) % this.width;
    const localY = ((y % this.width) + this.width) % this.width;
    const localZ = ((z % CHUNK_LAYER_HEIGHT) + CHUNK_LAYER_HEIGHT) % CHUNK_LAYER_HEIGHT;
    return localX + (localY * this.width) + (localZ * this.width * this.width);
  }

  private getCoordsFromIndex(index: number): { localX: number, localY: number, localZ: number } {
    const localX = index % this.width;
    const localY = Math.floor(index / this.width) % this.width;
    const localZ = Math.floor(index / (this.width * this.width));
    return { localX, localY, localZ };
  }

  private getLayerIndex(z: number): number {
    return Math.floor(z / CHUNK_LAYER_HEIGHT);
  }

  generateBlockChunck() {
    for (let x = this.traceX; x < this.limitX; x++) {
      for (let z = 0; z < this.height; z++) {
        for (let y = this.traceY; y < this.limitY; y++) {
          const index = this.getIndex(x, y, z);
          const layerIndex = this.getLayerIndex(z);
          const type = this.getBlock(x, z, y) ? BlockType.STONE : BlockType.AIR;
          this.blockDataByLayer[layerIndex][index] = type;
        }
      }
    }
  }

  generateChunckMesh() {
    this.blockData.forEach((layerData, layer) => {
      for (let index = 0; index < layerData.length; index++) {
        const type = layerData[index];
        if (type !== BlockType.AIR) {
          const { localX, localY, localZ } = this.getCoordsFromIndex(index);
          const x = localX + this.traceX;
          const y = localY + this.traceY;
          const z = localZ + (layer * CHUNK_LAYER_HEIGHT);
          this.getFaceToBlockDirection({ x, z, y }, layer, index);
        }
      }
    });
  }

  private getFaceToBlockDirection(
    location: { x: number; z: number; y: number },
    layer: number,
    blockIndex: number
  ) {
    const neigbourChuncksLayers = this.neigbourChuncks.map(l => l[layer]);
    const meshLayer = this.layers[layer];

    for (const key of Object.keys(this.faces) as (keyof FaceObj)[]) {
      const { corners, dir } = this.faces[key];
      const nestX = location.x + dir[0];
      const nestZ = location.z + dir[1];
      const nestY = location.y + dir[2];
      const neighborLayer = this.getLayerIndex(nestZ);
      const neighborIndex = this.getIndex(nestX, nestY, nestZ);

      let neighborBlock: number | undefined = BlockType.AIR;
      
      neighborBlock = [neighborLayer, neighborLayer + 1, neighborLayer - 1].map(l => this.blockData[l]?.[neighborIndex]).find(v => v !== undefined); 

      if (neighborBlock === undefined) {
        neighborBlock = neigbourChuncksLayers
          .find(n => n && n[neighborIndex] !== undefined)
          ?.[neighborIndex];
      }

      const neighbor = neighborBlock !== BlockType.AIR;

      if (!neighbor) {
        const ndx = meshLayer.positions.length / 3;

        meshLayer.indices.push(
          ndx, ndx + 1, ndx + 2,
          ndx + 2, ndx + 1, ndx + 3
        );

        for (const pos of corners) {
          meshLayer.positions.push(pos[0] + location.x, pos[1] + location.z, pos[2] + location.y);
          meshLayer.normals.push(...dir);
        }

        const triangle1 = (meshLayer.indices.length / 3) - 2;
        const triangle2 = (meshLayer.indices.length / 3) - 1;

        this.faceToBlock[layer][triangle1] = blockIndex;
        this.faceToBlock[layer][triangle2] = blockIndex;

        let count = this.blockFaceCounts[layer][blockIndex];
        const baseIndex = blockIndex * MAX_TRIANGLES_PER_BLOCK;

        this.blockToFace[layer][baseIndex + count] = triangle1;
        this.blockToFace[layer][baseIndex + count + 1] = triangle2;
        
        this.blockFaceCounts[layer][blockIndex] = count + 2;
      }
    }
  }

  removeBlock(layer: number): void {
    const layerData = this.blockData[layer];
    if (!layerData) return;

    for (let index = 0; index < layerData.length; index++) {
      if (layerData[index] !== BlockType.AIR) {
        const { localX, localY, localZ } = this.getCoordsFromIndex(index);
        const x = localX + this.traceX;
        const y = localY + this.traceY;
        const z = localZ + (layer * CHUNK_LAYER_HEIGHT);
        this.getFaceToBlockDirection({ x, z, y }, layer, index);
      }
    }
  }

  getChunckMeshData(layer: number | null): ChunckMeshGenData {
    return {
      faceToKey: layer 
        ? JSON.stringify(Array.from(this.faceToBlock[layer])) 
        : JSON.stringify(this.faceToBlock.map(f => Array.from(f))),
      keyToFace: layer 
        ? JSON.stringify(Array.from(this.blockToFace[layer])) 
        : JSON.stringify(this.blockToFace.map(k => Array.from(k))),
      layers: layer 
        ? JSON.stringify(this.layers[layer]) 
        : JSON.stringify(this.layers)
    };
  }

  getBlockData(): ChunckBlockGenData {
    return {
      blocks: JSON.stringify(this.blockDataByLayer.map(layer => Array.from(layer)))
    };
  }

  getBlock(x: number, z: number, y: number): boolean {
    const surface = this.baseHeight + this.noise(x, y) * 35;
    return z < surface;
  }
}