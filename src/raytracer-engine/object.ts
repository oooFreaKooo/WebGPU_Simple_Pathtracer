import { vec3, mat4 } from "gl-matrix"
import { deg2Rad } from "./math"
import { Triangle } from "./triangle"
import { Node } from "./node"

export class Object {
  model: mat4
  position: vec3
  rotation: vec3

  triangles: Triangle[]
  triangleIndices: number[]
  nodes: Node[]
  scale: vec3
  constructor(position: vec3, scale: vec3, eulers: vec3) {
    this.position = position
    this.rotation = eulers
    this.scale = scale
    this.calculate_transform()

    this.triangles = []
    this.triangleIndices = []
    this.nodes = []
  }

  update(rate: number) {
    this.rotation[2] += rate * 0.5
    if (this.rotation[2] > 360) {
      this.rotation[2] -= 360
    }
    this.calculate_transform()
  }

  calculate_transform() {
    this.model = mat4.create()
    mat4.translate(this.model, this.model, this.position)
    mat4.rotateZ(this.model, this.model, deg2Rad(this.rotation[2]))
    mat4.rotateX(this.model, this.model, deg2Rad(this.rotation[0]))
    mat4.scale(this.model, this.model, this.scale)
  }
}
