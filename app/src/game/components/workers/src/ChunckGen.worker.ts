import { ChunckMsgTypes } from "../../enums/ChunckMsgTypes";
import { ChunckGen } from "../../world/ChunckGen";


self.onmessage = async (e) => { 
    const { width, height, traceX, traceY, blockData, neigbourChuncks, seed, type } = e.data;

    const chunck = new ChunckGen({ 
            width: width, 
            height: height, 
            traceX: traceX, 
            traceY: traceY,
            seed: seed,
            blockData: blockData,
            neigbourChuncks: neigbourChuncks
    });

    let chunkData = {};


    switch(type) {
        case ChunckMsgTypes.GEN_BLOCK: {
            chunck.generateBlockChunck();

            chunkData = { 
                ...chunkData,
                ...chunck.getBlockData()
            };
            break;
        };
        case ChunckMsgTypes.GEN_MESH: {
            chunck.generateChunckMesh();

            chunkData = { 
                ...chunkData,
                ...chunck.getMeshData()
            };
            break;
        };
        case ChunckMsgTypes.REM_BLOCK: {

        }
    }

    self.postMessage(chunkData); 
};