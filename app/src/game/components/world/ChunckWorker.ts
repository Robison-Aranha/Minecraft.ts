import { Chunck } from "./Chunck";


self.onmessage = (e) => {
    const { width, height, traceX, traceY, removedBlocks, meshId } = e.data;
    const chunck = new Chunck({ 
            width: width, 
            height: height, 
            traceX: traceX, 
            traceY: traceY,
            removedBlocks: removedBlocks
        });
    chunck.generateChunck();
    self.postMessage({ ...chunck.getData(), meshId, removedBlocks });
};