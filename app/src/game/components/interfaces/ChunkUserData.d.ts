import { ChunkLayer } from "./ChunkGenData";
import * as THREE from "three";

export interface ChunkUserData {
    key: string,
    layerLevel: number,
    traceX?: number;
    traceY?: number;
    faceToKey: Int32Array<ArrayBufferLike>,
    keyToFace?: Int32Array<ArrayBufferLike>,
    hash?: number,
    bounds?: THREE.Box3,
    remapFaceIndex: Map<number, number>,
    layers: ChunkLayer[],
}