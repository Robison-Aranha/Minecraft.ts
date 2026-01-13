import { Chunck } from "../world/Chunck";

self.onmessage = (e) => {
    const { width, height, traceX, traceY, removedBlocks, seed, meshId } = e.data;
    const chunck = new Chunck({ 
            width: width, 
            height: height, 
            traceX: traceX, 
            traceY: traceY,
            seed: seed,
            removedBlocks: removedBlocks
        });
    chunck.generateChunck();
    self.postMessage({ ...chunck.getData(), meshId, removedBlocks });
};