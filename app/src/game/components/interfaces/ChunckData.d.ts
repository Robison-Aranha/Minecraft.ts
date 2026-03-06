import { BlockType } from "../enums/BlockType";

export interface ChunckData {
    x: number,
    y: number,
    blockData: Map<string, BlockType>
}