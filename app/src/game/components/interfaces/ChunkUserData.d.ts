import { ChunkLayer } from "./ChunkGenData";

export interface ChunkUserData {
    key: string,
    layerLevel: number,
    traceX?: number;
    traceY?: number;
    faceToKey: Int32Array<ArrayBufferLike>,
    keyToFace?: Int32Array<ArrayBufferLike>,
    remapFaceIndex: Map<number, number>,
    layers: ChunkLayer[],
}