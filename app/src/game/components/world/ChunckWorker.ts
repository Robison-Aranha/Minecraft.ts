import { Chunck } from "./Chunck";

self.onmessage = (e) => {
    const { width, height, traceX, traceY } = e.data;
    const chunck = new Chunck(width, height, traceX, traceY);
    chunck.generateChunck();
    self.postMessage({ ...chunck.getData(), ...chunck.getBlockIndex() });
};