export interface ChunckUserData {
    key: string,
    layerLevel: number,
    traceX?: number;
    traceY?: number;
    faceToKey: Map<number, string>,
    keyToFace?: Map<string, number[]>,
    remapFaceIndex: Map<number, number>,
    layers: ChunckLayer[]
}