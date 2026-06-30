import { BlockType } from "../enums/BlockType";

export interface ChunkData {
  x: number;
  y: number;
  blockData: Map<string, BlockType>;
}
