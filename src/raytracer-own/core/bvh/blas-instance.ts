import { mat4, vec3 } from 'gl-matrix'
import { Deg2Rad } from '../../utils/helper'

export class BLASInstance {
    transform: mat4
    transformInv: mat4
    blasOffset: number
    materialIdx: number

    constructor (position: vec3, scale: vec3, rotation: vec3, blasOffset: number, materialIdx: number) {
        this.transform = mat4.create()
        this.transformInv = mat4.create()
        this.blasOffset = blasOffset
        this.materialIdx = materialIdx

        mat4.identity(this.transform)
        mat4.translate(this.transform, this.transform, position)
        mat4.rotateZ(this.transform, this.transform, Deg2Rad(rotation[2]))
        mat4.rotateY(this.transform, this.transform, Deg2Rad(rotation[1]))
        mat4.rotateX(this.transform, this.transform, Deg2Rad(rotation[0]))
        mat4.scale(this.transform, this.transform, scale)

        // Compute the inverse transformation matrix
        if (!mat4.invert(this.transformInv, this.transform)) {
            console.error('Failed to invert the transformation matrix.')
        }
    }
}