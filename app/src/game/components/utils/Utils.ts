import { CHUNK_SIZE } from "../enums/Enums";

export function getIndex(x: number, z: number, y: number): number {
  return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
}

export const loadDataFaceToKey = (
  faceToKeyKeys: ArrayBufferLike,
  faceToKeyValues: ArrayBufferLike[]
): Map<number, string> => {
  const map = new Map<number, string>();
  const keys = new Uint32Array(faceToKeyKeys);
  const decoder = new TextDecoder();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = decoder.decode(new Uint8Array(faceToKeyValues[i]));
    map.set(key, value);
  }

  return map;
};

export const loadDataKeyToFace = (
  keysBuf: ArrayBuffer,
  keyOffBuf: ArrayBuffer,
  valuesBuf: ArrayBuffer,
  valueOffBuf: ArrayBuffer
): Map<string, number[]> => {
  const keys = new Uint8Array(keysBuf);
  const keyOffsets = new Uint32Array(keyOffBuf);
  const values = new Uint32Array(valuesBuf);
  const valueOffsets = new Uint32Array(valueOffBuf);
  const dec = new TextDecoder();
  const map = new Map<string, number[]>();
  for (let i = 0; i < keyOffsets.length; i++) {
    const k0 = keyOffsets[i],
      k1 = keyOffsets[i + 1] ?? keys.length;
    const v0 = valueOffsets[i],
      v1 = valueOffsets[i + 1] ?? values.length;
    map.set(
      dec.decode(keys.subarray(k0, k1)),
      Array.from(values.subarray(v0, v1))
    );
  }
  return map;
};


export const remapMeshIndex = (originalIndexMap: number[][], reorderedIndexMap: number[][]) => {
  const remap = new Map<number, number>();

    for (let newId = 0; newId < reorderedIndexMap.length; newId++) {
      const triNew = reorderedIndexMap[newId];

      for (let oldId = 0; oldId < originalIndexMap.length; oldId++) {
        const triOld = originalIndexMap[oldId];

        if (
          triNew[0] === triOld[0] &&
          triNew[1] === triOld[1] &&
          triNew[2] === triOld[2]
        ) {
          remap.set(newId, oldId);
          break;
        }
      }
    }

    return remap;
}

