export interface ChunckMeshGenData {      
  faceToKey: string;       
  keyToFace: string;
  layers: string,
  key?: string;
}

export interface ChunckBlockGenData {
  blocks: string;
  key?: string;
}

interface ChunckLayer {
  positions: number[];
  normals: number[];
  indices: number[];
}


