import { mat4 } from "gl-matrix";

export const BLAS_INSTANCE_BYTE_SIZE: number =
    16 * 4 + // transform (mat4)
    16 * 4 + // transform inverse (mat4)
    4 + // blas offset (uint32)
    4 + // material index (uint32)
    8; // padding

export class BLASInstance {
    transform: mat4;
    transformInv: mat4;
    blasOffset: number;
    materialIdx: number;

    constructor(transform: mat4, blasOffset: number, materialIdx: number) {
        this.transform = transform;
        this.transformInv = mat4.invert(mat4.create(), transform);
        this.blasOffset = blasOffset;
        this.materialIdx = materialIdx;
    }
}
