import ChunkGenerationWorker from "./ChunkGen.worker.ts?worker";

export const WorkerPaths = {
  CHUNK_GENERATION: ChunkGenerationWorker,
};

type WorkerConstructor = new () => Worker;

export function createWorker(WorkerClass: WorkerConstructor): Worker {
  return new WorkerClass();
}
