import * as THREE from "three";
import { BlockType } from "../enums/BlockType";
import { Collider } from "../interfaces/ChunckMan";

export class ChunckMan {

    private chunckMeshMap: Map<string, THREE.Mesh[]> = new Map<string, THREE.Mesh[]>();
    private chunckColliderMap: Map<string, Collider[]> = new Map<string, Collider[]>();
    private chunckBlocksMap: Map<string, Uint8Array[]> = new Map<string, Uint8Array[]>();

    getChunckMeshMap(): ReadonlyMap<string, THREE.Mesh[]>  {
        return this.chunckMeshMap;
    }

    getChunckColliderMap():  ReadonlyMap<string, Collider[]> {
        return this.chunckColliderMap;
    }

    getChunckBlocksMap(): ReadonlyMap<string, Uint8Array[]> {
        return this.chunckBlocksMap;
    }

    setValueMeshMap(key: string, meshs: THREE.Mesh[]) {
        this.chunckMeshMap.set(key, meshs);
    }

    setValueBlocksMap(key: string, blockArrays: Uint8Array[]) {
        this.chunckBlocksMap.set(key, blockArrays);
    }

    setBlockValueInChunckBlocksMap(chunckKey: string, layer: number, blockIndex: number, blockValue: BlockType) {
        const obj = this.chunckBlocksMap.get(chunckKey);

        if (obj && obj[layer]) {
            obj[layer][blockIndex] = blockValue;
            return true;
        }
        return false;
    }

    setValueColliderMap(key: string, collider: Collider[]) {
        this.chunckColliderMap.set(key, collider);
    }
}