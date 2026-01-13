import { Mesh } from "three";
import { ChunckManagerMsgTypes } from "../enums/ChunckManagerMsgTypes";
import { ChunckUserData } from "../interfaces/ChunckUserData";

const chunckMap = new Map<string, Mesh>();

self.onmessage = (e: { data: { msg: ChunckManagerMsgTypes, payload: ChunckUserData } }) => {

    const { msg, payload } = e.data;

    switch(msg) {
        case ChunckManagerMsgTypes.SAVE: {

            const key = `${pa}${}`

            chunckMap.set()


        }

    }


 }