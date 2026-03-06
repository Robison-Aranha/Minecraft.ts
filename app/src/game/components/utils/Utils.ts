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

