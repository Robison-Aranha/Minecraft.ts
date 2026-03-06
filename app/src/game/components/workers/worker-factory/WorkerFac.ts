import ChunckGenerationWorker from "../src/ChunckGen.worker?worker";

export const WorkerPaths = {
  CHUNCK_GENERATION: ChunckGenerationWorker,
};

export function createWorker(WorkerClass: any) {
  return new WorkerClass();
}