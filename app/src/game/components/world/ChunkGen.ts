import { BufferGeometry, BufferAttribute } from "three";
import { MeshBVH } from "three-mesh-bvh";
import {
  CHUNK_LAYER_HEIGHT,
  CHUNK_SIZE,
  CHUNK_TOTAL_HEIGHT,
} from "../const/Const";
import { BlockType } from "../enums/BlockType";
import {
  ChunkBlockGenData,
  ChunkLayer,
  ChunkMeshGenData,
} from "../interfaces/ChunkGenData";
import {
  mulberry32,
  chunksAfecteds,
  getCoordsFromIndex,
  getLayerIndex,
  getIndex,
} from "../utils/Utils";
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

interface ChunkOptions {
  width?: number;
  height?: number;
  traceX?: number;
  traceY?: number;
  seed: number;
  blockData: string;
  neighbourChunks: string;
}

const MAX_TRIANGLES_PER_BLOCK = 12;

export class ChunkGen {
  private width: number = CHUNK_SIZE;
  private height: number = CHUNK_TOTAL_HEIGHT;
  private traceX: number;
  private traceY: number;
  private limitX: number;
  private limitY: number;
  private noise;
  private neighbourChunks: Uint8Array[][];
  private blockData: Uint8Array[];
  private blockDataByLayer: Uint8Array[] = [];
  private faceToBlock: Int32Array[] = [];
  private blockToFace: Int32Array[] = [];
  private blockFaceCounts: Uint8Array[] = [];
  private baseHeight = 200;
  private layers: ChunkLayer[] = [];

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

  constructor(options: ChunkOptions) {
    this.traceX = options.traceX ?? 0;
    this.traceY = options.traceY ?? 0;
    this.limitX = this.traceX + this.width;
    this.limitY = this.traceY + this.width;

    const parsedNeighbours: number[][][] = JSON.parse(options.neighbourChunks);
    this.neighbourChunks = parsedNeighbours.map((n) =>
      n ? n.map((c) => new Uint8Array(c)) : [],
    );

    const parsedBlockData: number[][] = JSON.parse(options.blockData);
    this.blockData = parsedBlockData.map((b) => new Uint8Array(b));

    this.noise = createOctaveNoise2D(
      {
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2,
        scale: 100,
      },
      createNoise2D(mulberry32(options.seed)),
    );

    const totalLayers = Math.ceil(this.height / CHUNK_LAYER_HEIGHT);

    for (let i = 0; i < totalLayers; i++) {
      const isLastLayer = i === totalLayers - 1;
      const heightRemainder = this.height % CHUNK_LAYER_HEIGHT;

      const currentLayerHeight =
        isLastLayer && heightRemainder !== 0
          ? heightRemainder
          : CHUNK_LAYER_HEIGHT;

      const layerVolume = this.width * this.width * currentLayerHeight;

      this.layers.push({ positions: [], normals: [], indices: [], serializedBVH: null });

      this.blockDataByLayer.push(new Uint8Array(layerVolume));

      const maxTrianglesInLayer = layerVolume * MAX_TRIANGLES_PER_BLOCK;
      this.faceToBlock.push(new Int32Array(maxTrianglesInLayer).fill(-1));
      this.blockToFace.push(new Int32Array(maxTrianglesInLayer).fill(-1));
      this.blockFaceCounts.push(new Uint8Array(layerVolume));
    }
  }

  generateBlockChunk() {
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      for (let localZ = 0; localZ < this.height; localZ++) {
        for (let localY = 0; localY < CHUNK_SIZE; localY++) {
          const worldX = this.traceX + localX;
          const worldY = this.traceY + localY;

          const index = getIndex(localX, localY, localZ, this.width);
          const layerIndex = getLayerIndex(localZ);
          const type = this.getBlock(worldX, localZ, worldY) ? BlockType.STONE : BlockType.AIR;
          this.blockDataByLayer[layerIndex][index] = type;
        }
      }
    }
  }

  generateChunkMesh() {
    this.blockData.forEach((_, layer) => {
      this.generateChunkLayer(layer);
    });
  }

  generateChunkLayer(layer: number) {
    const layerData = this.blockData[layer];

    for (let index = 0; index < layerData.length; index++) {
      const type = layerData[index];

      if (type !== BlockType.AIR) {
        const { localX, localY, localZ } = getCoordsFromIndex(
          index,
          this.width,
        );

        const x = localX + this.traceX;
        const y = localY + this.traceY;
        const z = localZ + layer * CHUNK_LAYER_HEIGHT;

        this.getFaceToBlockDirection({ x, z, y }, layer, index);
      }
    }
  }

  private getFaceToBlockDirection(
    location: { x: number; z: number; y: number },
    layer: number,
    blockIndex: number,
  ) {
    const meshLayer = this.layers[layer];

    for (const key of Object.keys(this.faces) as (keyof FaceObj)[]) {
      const { corners, dir } = this.faces[key];

      const nestX = location.x + dir[0];
      const nestZ = location.z + dir[1];
      const nestY = location.y + dir[2];

      const neighborLayer = getLayerIndex(nestZ);
      const neighborIndex = getIndex(nestX, nestY, nestZ, this.width);

      const neighborRef = chunksAfecteds(
        nestX,
        nestY,
        this.traceX,
        this.traceY,
        this.limitX,
        this.limitY,
      );

      let neighborBlock: number | undefined;

      if (neighborRef) {
        neighborBlock =
          this.neighbourChunks[neighborRef.chunk]?.[neighborLayer]?.[
          neighborIndex
          ];
      } else {
        neighborBlock = this.blockData[neighborLayer]?.[neighborIndex];
      }

      if (neighborBlock === BlockType.AIR) {
        const ndx = meshLayer.positions.length / 3;

        meshLayer.indices.push(
          ndx,
          ndx + 1,
          ndx + 2,
          ndx + 2,
          ndx + 1,
          ndx + 3,
        );

        for (const pos of corners) {
          meshLayer.positions.push(
            pos[0] + location.x,
            pos[1] + location.z,
            pos[2] + location.y,
          );
          meshLayer.normals.push(...dir);
        }

        const triangle1 = meshLayer.indices.length / 3 - 2;
        const triangle2 = meshLayer.indices.length / 3 - 1;

        this.faceToBlock[layer][triangle1] = blockIndex;
        this.faceToBlock[layer][triangle2] = blockIndex;

        const count = this.blockFaceCounts[layer][blockIndex];
        const baseIndex = blockIndex * MAX_TRIANGLES_PER_BLOCK;

        this.blockToFace[layer][baseIndex + count] = triangle1;
        this.blockToFace[layer][baseIndex + count + 1] = triangle2;

        this.blockFaceCounts[layer][blockIndex] = count + 2;
      }
    }
  }

 getChunkMeshData(layer: number | null): any {
    const processLayer = (l: ChunkLayer) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new BufferAttribute(new Float32Array(l.positions), 3));
      geometry.setAttribute("normal", new BufferAttribute(new Float32Array(l.normals), 3));
      geometry.setIndex(new BufferAttribute(new Uint32Array(l.indices), 1));
      
      const bvh = new MeshBVH(geometry);
      const serialized = MeshBVH.serialize(bvh, { cloneBuffers: false });
      
      return {
        positions: l.positions,
        normals: l.normals,
        indices: l.indices,
        serializedBVH: serialized
      };
    };

    const processedLayers = layer !== null 
      ? processLayer(this.layers[layer]) 
      : this.layers.map(processLayer);

    return {
      faceToKey: layer
        ? JSON.stringify(Array.from(this.faceToBlock[layer]))
        : JSON.stringify(this.faceToBlock.map((f) => Array.from(f))),
      keyToFace: layer
        ? JSON.stringify(Array.from(this.blockToFace[layer]))
        : JSON.stringify(this.blockToFace.map((k) => Array.from(k))),
      layers: processedLayers,
    };
  }

  getBlockData(): ChunkBlockGenData {
    return {
      blocks: JSON.stringify(
        this.blockDataByLayer.map((layer) => Array.from(layer)),
      ),
    };
  }

  getBlock(x: number, z: number, y: number): boolean {
    const surface = this.baseHeight + this.noise(x, y) * 35;
    return z < surface;
  }
}