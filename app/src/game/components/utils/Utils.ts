import { CHUNK_LAYER_HEIGHT, CHUNK_SIZE } from "../const/Const";

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

export function hashStringToSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

 export function getNearChunksKeysCollider(traceX: number, traceY: number) {
    return [
      `${traceX}:${traceY}`,
      `${traceX + CHUNK_SIZE}:${traceY}`,
      `${traceX + CHUNK_SIZE}:${traceY + CHUNK_SIZE}`,
      `${traceX + CHUNK_SIZE}:${traceY - CHUNK_SIZE}`,
      `${traceX - CHUNK_SIZE}:${traceY}`,
      `${traceX - CHUNK_SIZE}:${traceY - CHUNK_SIZE}`,
      `${traceX - CHUNK_SIZE}:${traceY + CHUNK_SIZE}`,
      `${traceX}:${traceY + CHUNK_SIZE}`,
      `${traceX}:${traceY - CHUNK_SIZE}`,
    ];
  }

  export function getNearChunksKeysGen(traceX: number, traceY: number) {
    return [
      `${traceX + CHUNK_SIZE}:${traceY}`,
      `${traceX - CHUNK_SIZE}:${traceY}`,
      `${traceX}:${traceY + CHUNK_SIZE}`,
      `${traceX}:${traceY - CHUNK_SIZE}`,
    ];
  }

export function getChunksKeysToRender(
    traceX: number,
    traceY: number,
    chunkQt: number
) {
  const borderKeys: string[] = [];
  const innerKeys: string[] = [];

  for (let x = -chunkQt; x <= chunkQt; x++) {
    for (let y = -chunkQt; y <= chunkQt; y++) {
      const worldX = traceX + x * CHUNK_SIZE;
      const worldY = traceY + y * CHUNK_SIZE;

      const key = `${worldX}:${worldY}`;

      const isBorder =
          Math.abs(x) === chunkQt ||
          Math.abs(y) === chunkQt;

      if (isBorder) {
        borderKeys.push(key);
      } else {
        innerKeys.push(key);
      }
    }
  }

  return {
    innerKeys,
    borderKeys,
  };
}

  export function getCoordsFromIndex(index: number, width: number): {
    localX: number;
    localY: number;
    localZ: number;
  } { 
    const localX = index % width;
    const localY = Math.floor(index / width) % width;
    const localZ = Math.floor(index / (width * width));
    return { localX, localY, localZ };
  }

export function chunksAfecteds(
  nestX: number,
  nestY: number,
  traceX: number,
  traceY: number,
  limitX: number,
  limitY: number
) {
  const neighborMap = [
    {
      valid: nestX >= limitX,
      chunk: 0
    },
    {
      valid: nestX < traceX,
      chunk: 1
    },
    {
      valid: nestY >= limitY,
      chunk: 2
    },
    {
      valid: nestY < traceY,
      chunk: 3
    }
  ];

  return neighborMap.find(n => n.valid);
}

export function getLayerIndex(z: number): number {
    return Math.floor(z / CHUNK_LAYER_HEIGHT);
}

export function getIndex(x: number, y: number, z: number, width: number): number {
  const localX = ((x % width) + width) % width;
  const localY = ((y % width) + width) % width;
  const localZ =
    ((z % CHUNK_LAYER_HEIGHT) + CHUNK_LAYER_HEIGHT) % CHUNK_LAYER_HEIGHT;
  return localX + localY * width + localZ * width * width;
}
