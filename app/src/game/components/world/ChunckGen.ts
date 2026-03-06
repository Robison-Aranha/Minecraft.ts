import { CHUNK_LAYER_HEIGHT } from "../const/const";
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

export class ChunckGen {

  private width: number;
  private height: number;
  private traceX: number;
  private traceY: number;
  private limitX: number;
  private limitY: number;

  private noise;
  private neigbourChuncks: Array<Map<string, BlockType>>;

  private blockData: Map<string, BlockType>;

  private blockDataByLayer: Map<string, BlockType>[] = [];

  private faceToKey: Map<string, string> = new Map();
  private keyToFace: Map<string, string[]> = new Map();

  private baseHeight = 200;

  private layers: ChunckLayer[] = [];

  private faces: FaceObj = {
    left: { dir: [-1, 0, 0], corners: [[0,1,0],[0,0,0],[0,1,1],[0,0,1]] },
    right: { dir: [1, 0, 0], corners: [[1,1,1],[1,0,1],[1,1,0],[1,0,0]] },
    bottom: { dir: [0, -1, 0], corners: [[1,0,1],[0,0,1],[1,0,0],[0,0,0]] },
    top: { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[0,1,0],[1,1,0]] },
    back: { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[1,1,0],[0,1,0]] },
    front: { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[0,1,1],[1,1,1]] },
  };

  constructor(options: ChunckOptions) {

    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.traceX = options.traceX ?? 0;
    this.traceY = options.traceY ?? 0;

    this.limitX = this.traceX >= 0 ? this.width + this.traceX : this.traceX + this.width;
    this.limitY = this.traceY >= 0 ? this.width + this.traceY : this.traceY + this.width;

    const parsedArrayOfStringedMaps: string[] = JSON.parse(options.neigbourChuncks);

    this.neigbourChuncks = parsedArrayOfStringedMaps.map(n =>
      n ? new Map<string, BlockType>(JSON.parse(n)) : new Map()
    );

    this.blockData = new Map(JSON.parse(options.blockData));

    this.noise = createOctaveNoise2D({
      octaves: 4,
      persistence: 0.5,
      lacunarity: 2,
      scale: 100,
    }, createNoise2D(mulberry32(options.seed)));

    const totalLayers = Math.ceil(this.height / CHUNK_LAYER_HEIGHT);

    for (let i = 0; i < totalLayers; i++) {
      this.layers.push({
        positions: [],
        normals: [],
        indices: []
      });

      // 🔥 cria blockData por layer
      this.blockDataByLayer.push(new Map());
    }
  }

  private getLayerIndex(z: number): number {
    return Math.floor(z / CHUNK_LAYER_HEIGHT);
  }

  generateBlockChunck() {
    for (let x = this.traceX; x < this.limitX; x++) {
      for (let z = 0; z < this.height; z++) {
        for (let y = this.traceY; y < this.limitY; y++) {

          const key = `${x},${z},${y}`;
          const layerIndex = this.getLayerIndex(z);
          const type = this.getBlock(x, z, y)
            ? BlockType.STONE
            : BlockType.AIR;

          this.blockData.set(key, type);

          // 🔥 salva também na layer
          this.blockDataByLayer[layerIndex].set(key, type);
        }
      }
    }
  }

  generateChunckMesh() {
    this.blockData.forEach((type, key) => {
      if (type !== BlockType.AIR) {
        const [x, z, y] = key.split(",");
        this.getFaceToBlockDirection(
          { x: Number(x), z: Number(z), y: Number(y) },
          key
        );
      }
    });
  }

  private getFaceToBlockDirection(
    location: { x: number; z: number; y: number },
    keyMap: string
  ) {

    const layerIndex = this.getLayerIndex(location.z);
    const layer = this.layers[layerIndex];

    const faceKeys: string[] = [];

    for (const key of Object.keys(this.faces) as (keyof FaceObj)[]) {

      const { corners, dir } = this.faces[key];

      const nestX = location.x + dir[0];
      const nestZ = location.z + dir[1];
      const nestY = location.y + dir[2];

      const neighborKey = `${nestX},${nestZ},${nestY}`;

      let neighborBlock = this.blockData.get(neighborKey)

      if (neighborBlock === undefined) {
        neighborBlock = this.neigbourChuncks
          .find(n => n.get(neighborKey) !== undefined)
          ?.get(neighborKey);
      }

      const neighbor = neighborBlock !== BlockType.AIR;

      if (!neighbor) {

        const ndx = layer.positions.length / 3;

        layer.indices.push(
          ndx, ndx + 1, ndx + 2,
          ndx + 2, ndx + 1, ndx + 3
        );

        for (const pos of corners) {
          layer.positions.push(
            pos[0] + location.x,
            pos[1] + location.z,
            pos[2] + location.y
          );
          layer.normals.push(...dir);
        }

        const faceIndex1 = `${layerIndex}:${layer.indices.length / 3 - 2}`;
        const faceIndex2 = `${layerIndex}:${layer.indices.length / 3 - 1}`;

        this.faceToKey.set(faceIndex1, keyMap);
        this.faceToKey.set(faceIndex2, keyMap);

        faceKeys.push(faceIndex1, faceIndex2);
      }
    }

    if (faceKeys.length > 0) {
      this.keyToFace.set(keyMap, faceKeys);
    }
  }

  getMeshData(): ChunckMeshGenData {

    const mergedPositions: number[] = [];
    const mergedNormals: number[] = [];
    const mergedIndices: number[] = [];

    let vertexOffset = 0;

    for (const layer of this.layers) {

      mergedPositions.push(...layer.positions);
      mergedNormals.push(...layer.normals);

      for (const index of layer.indices) {
        mergedIndices.push(index + vertexOffset);
      }

      vertexOffset += layer.positions.length / 3;
    }

    return {
      positions: JSON.stringify(mergedPositions),
      normals: JSON.stringify(mergedNormals),
      indices: JSON.stringify(mergedIndices),
      faceToKey: JSON.stringify([...this.faceToKey]),
      keyToFace: JSON.stringify([...this.keyToFace]),
      layers: JSON.stringify(this.layers)
    };
  }

  getBlockData(): ChunckBlockGenData {
    return {
      blocks: JSON.stringify(
        this.blockDataByLayer.map(layer => [...layer])
      )
    };
  }

  getBlock(x: number, z: number, y: number): boolean {
    const surface = this.baseHeight + this.noise(x, y) * 35;
    return z < surface;
  }
}