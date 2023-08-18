import { mat4, vec3 } from "gl-matrix"
import { Material } from "./material"

export class blasDescription {
  minCorner: vec3
  maxCorner: vec3
  center: vec3
  inverseModel: mat4 = mat4.create()
  rootNodeIndex: number
  triangleIndices: number[]
  materialProperties: Material

  constructor(minCorner: vec3, maxCorner: vec3, model: mat4) {
    this.minCorner = [999999, 999999, 999999]
    this.maxCorner = [-999999, -999999, -999999]
    var corner: vec3 = vec3.create()

    const corners: vec3[] = [
      [minCorner[0], minCorner[1], minCorner[2]],
      [minCorner[0], minCorner[1], maxCorner[2]],
      [minCorner[0], maxCorner[1], minCorner[2]],
      [minCorner[0], maxCorner[1], maxCorner[2]],
      [maxCorner[0], minCorner[1], minCorner[2]],
      [maxCorner[0], minCorner[1], maxCorner[2]],
      [maxCorner[0], maxCorner[1], minCorner[2]],
      [maxCorner[0], maxCorner[1], maxCorner[2]],
    ]

    for (let i = 0; i < 8; i++) {
      vec3.transformMat4(corner, corners[i], model)
      vec3.min(this.minCorner, this.minCorner, corner)
      vec3.max(this.maxCorner, this.maxCorner, corner)
    }

    this.center = [
      (this.minCorner[0] + this.maxCorner[0]) / 2,
      (this.minCorner[1] + this.maxCorner[1]) / 2,
      (this.minCorner[2] + this.maxCorner[2]) / 2,
    ]
    mat4.invert(this.inverseModel, model)
  }
}
