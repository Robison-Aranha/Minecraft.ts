
export interface ChunckUserData {
    traceX?: number;
    traceY?: number;
    faceToKey: Map<number, string>,
    keyToFace?: Map<string, number[]>,
    blockData: Map<string, BlockData>,
    addedBlocks?: Set<string>;
    removedBlocks?: Set<string>;
    remapFaceIndex: Map<number, number>
}