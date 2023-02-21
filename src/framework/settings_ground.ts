import { vec3, mat4 } from "gl-matrix"
import { Deg2Rad } from "../engine/helper"

export class Ground {
  position: vec3
  model: mat4

  constructor(position: vec3) {
    this.position = position
  }

  update() {
    this.model = mat4.create()
    const scale = new Float32Array([5.0, 5.0, 5.0])

    mat4.scale(this.model, this.model, scale)
    mat4.translate(this.model, this.model, this.position)
    mat4.rotateX(this.model, this.model, Deg2Rad(90))
  }

  get_model(): mat4 {
    return this.model
  }
}
