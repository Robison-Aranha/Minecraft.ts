import * as THREE from "three";
import { BlockType } from "../enums/BlockType";
import { MeshBVH } from "three-mesh-bvh";

interface Collider {
  matrix: THREE.Matrix4;
  bhv: MeshBVH;
}

export class ChunckMan {

    private chunckMeshMap: Map<string, THREE.Mesh[]> = new Map<string, THREE.Mesh[]>();
    private chunckColliderMap: Map<string, Collider> = new Map<string, Collider>();
    private chunckBlocksMap: Map<string, Map<string, BlockType>[]> = new  Map<string, Map<string, BlockType>[]>();


    getChunckMeshMap(): ReadonlyMap<string, THREE.Mesh[]>  {
        return this.chunckMeshMap;
    }

    getChunckColliderMap():  ReadonlyMap<string, Collider> {
        return this.chunckColliderMap;
    }

    getChunckBlocksMap(): ReadonlyMap<string, Map<string, BlockType>[]> {
        return this.chunckBlocksMap;
    }

    setValueMeshMap(key: string, meshs: THREE.Mesh[]) {
        this.chunckMeshMap.set(key, meshs);
    }

    setValueBlocksMap(key: string, blockMaps: Map<string, BlockType>[]) {
        this.chunckBlocksMap.set(key, blockMaps);
    }

    setBlockValueInChunckBlocksMap(chunckKey: string, layer: number, blockKey: string, blockValue: BlockType) {
        const obj = this.chunckBlocksMap.get(chunckKey);

        return obj ? obj[layer].set(blockKey, blockValue) : null
    }

    setValueColliderMap(key: string, collider: Collider) {
        this.chunckColliderMap.set(key, collider)
    }

}