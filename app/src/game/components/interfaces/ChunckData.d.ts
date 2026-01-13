import { BlockType } from "../enums/BlockType";

export interface ChunckData {
    x: number,
    y: number,
    addedBlocks: BlockData[],
    removedBlocks: BlockData[],
}

interface BlockData {
    type: BlockType,
    cord: string,
    isEdge: boolean
}