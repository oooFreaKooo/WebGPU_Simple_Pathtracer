import { mat4, vec3 } from "gl-matrix";
import { Deg2Rad } from "../../utils/helper";

export class BLASInstance {
    transform: mat4;
    transformInv: mat4;
    blasOffset: number;
    materialIdx: number;

    constructor(position: vec3, scale: vec3, rotation: vec3, blasOffset: number, materialIdx: number) {
        this.transform = mat4.create();
        this.transformInv = mat4.create();
        this.blasOffset = blasOffset;
        this.materialIdx = materialIdx;

        // Compute the transformation matrix: Scale -> Rotate (Z -> Y -> X) -> Translate
        mat4.identity(this.transform);

        // 1. Scale
        mat4.scale(this.transform, this.transform, scale);

        // 2. Rotate (apply rotations in ZYX order for proper orientation)
        mat4.rotateZ(this.transform, this.transform, Deg2Rad(rotation[2]));
        mat4.rotateY(this.transform, this.transform, Deg2Rad(rotation[1]));
        mat4.rotateX(this.transform, this.transform, Deg2Rad(rotation[0]));

        // 3. Translate
        mat4.translate(this.transform, this.transform, position);

        // Compute the inverse transformation matrix
        if (!mat4.invert(this.transformInv, this.transform)) {
            console.error("Failed to invert the transformation matrix.");
        }
    }
}