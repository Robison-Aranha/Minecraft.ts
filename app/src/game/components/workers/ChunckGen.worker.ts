import { ChunckMsgTypes } from "../enums/ChunckMsgTypes";
import { ChunckGen } from "../world/ChunckGen";


self.onmessage = async (e) => { 
    const {traceX, traceY, blockData, neigbourChuncks, seed, type, layer } = e.data;

    const chunck = new ChunckGen({  
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
                ...chunck.getChunckMeshData(null)
            };
            break;
        };
        case ChunckMsgTypes.REM_BLOCK: {
            chunck.removeBlock(layer)
            
            chunkData = {
                ...chunkData,
                layer,
                ...chunck.getChunckMeshData(layer)
            };
            break;
        }
    }

    self.postMessage(chunkData); 
};