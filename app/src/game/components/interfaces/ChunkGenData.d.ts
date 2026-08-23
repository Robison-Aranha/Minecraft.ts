export interface ChunkMeshGenData {
  faceToKey: string;
  keyToFace: string;
  layers: string;
}

export interface ChunkBlockGenData {
  blocks: any;
}

interface ChunkLayer {
  positions: number[];
  normals: number[];
  indices: number[];
  serializedBVH: any;
}
