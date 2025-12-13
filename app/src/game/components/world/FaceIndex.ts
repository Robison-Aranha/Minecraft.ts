export class FaceIndex {
    positionsIndex?: number;
    indicesIndex?: number;
    normalsIndex?: number;

    constructor(positionIndex:number, indicesIndex:number, normalsIndex: number) {
      this.positionsIndex = positionIndex;
      this.indicesIndex = indicesIndex;
      this.normalsIndex = normalsIndex;
    }
}