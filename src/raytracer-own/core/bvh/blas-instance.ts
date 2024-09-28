import { mat4 } from "gl-matrix";

export class BLASInstance {
    transform: mat4;
    transformInv: mat4;
    blasOffset: number;
    materialIdx: number;

    constructor(transform: mat4, transformInv: mat4, blasOffset: number, materialIdx: number) {
        this.transform = mat4.clone(transform);
        this.transformInv = mat4.clone(transformInv);
        this.blasOffset = blasOffset;
        this.materialIdx = materialIdx;
    }
}
