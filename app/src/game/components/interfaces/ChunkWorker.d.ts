export interface ChunkMeshGenDataWorker {
  faceToKey: ArrayBuffer;
  keyToFace: ArrayBuffer;
  layers: any;
  layer: number;
  key: ?string;
}