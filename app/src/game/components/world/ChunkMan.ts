import * as THREE from "three";
import { BlockType } from "../enums/BlockType";
import { Collider } from "../interfaces/ChunkMan";

export class ChunkMan {

    private chunkMeshMap: Map<string, THREE.Mesh[]> = new Map<string, THREE.Mesh[]>();
    private chunkColliderMap: Map<string, Collider[]> = new Map<string, Collider[]>();
    private chunkBlocksMap: Map<string, Uint8Array[]> = new Map<string, Uint8Array[]>();

    getChunkMeshMap(): ReadonlyMap<string, THREE.Mesh[]>  {
        return this.chunkMeshMap;
    }

    getChunkColliderMap():  ReadonlyMap<string, Collider[]> {
        return this.chunkColliderMap;
    }

    getChunkBlocksMap(): ReadonlyMap<string, Uint8Array[]> {
        return this.chunkBlocksMap;
    }

    setValueMeshMap(key: string, meshs: THREE.Mesh[]) {
        this.chunkMeshMap.set(key, meshs);
    }

    setValueBlocksMap(key: string, blockArrays: Uint8Array[]) {
        this.chunkBlocksMap.set(key, blockArrays);
    }

    setBlockValueInChunkBlocksMap(chunkKey: string, layer: number, blockIndex: number, blockValue: BlockType) {
        const obj = this.chunkBlocksMap.get(chunkKey);

        if (obj && obj[layer]) {
            obj[layer][blockIndex] = blockValue;
            return true;
        }
        return false;
    }

    setValueColliderMap(key: string, collider: Collider[]) {
        this.chunkColliderMap.set(key, collider);
    }
}