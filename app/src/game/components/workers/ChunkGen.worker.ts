import { ChunkMsgTypes } from "../enums/ChunkMsgTypes.ts";
import { ChunkGen } from "../world/ChunkGen.ts";

self.onmessage = async (e) => {
  const { traceX, traceY, blockData, neighbourChunks, seed, type, layer } =
    e.data;

  const chunk = new ChunkGen({
    traceX: traceX,
    traceY: traceY,
    seed: seed,
    blockData: blockData,
    neighbourChunks: neighbourChunks,
  });

  let chunkData = { key: `${traceX}:${traceY}`, layer: layer };

  switch (type) {
    case ChunkMsgTypes.GEN_BLOCK: {
      chunk.generateBlockChunk();

      chunkData = {
        ...chunkData,
        ...chunk.getBlockData(),
      };
      break;
    }
    case ChunkMsgTypes.GEN_MESH: {
      chunk.generateChunkMesh();

      chunkData = {
        ...chunkData,
        ...chunk.getChunkMeshData(null),
      };
      break;
    }
    case ChunkMsgTypes.CHANGE_CHUNK: {
      chunk.generateChunkLayer(layer);

      chunkData = {
        ...chunkData,
        ...chunk.getChunkMeshData(layer),
      };
      break;
    }
  }

  self.postMessage(chunkData);
};
