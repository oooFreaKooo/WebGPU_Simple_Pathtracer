import { vec3 } from "gl-matrix"
import { Deg2Rad } from "../utils/helper"

export class Camera {
  position: Float32Array
  theta: number
  phi: number
  fov: number
  forwards: Float32Array
  right: Float32Array
  up: Float32Array
  cameraIsMoving: boolean = false

  constructor(position: number[], fovDegrees = 120.0) {
    this.position = new Float32Array(position)
    this.theta = 0.0
    this.phi = 0.0
    this.fov = Deg2Rad(fovDegrees)

    this.recalculate_vectors()
  }

  recalculate_vectors() {
    this.forwards = new Float32Array([
      Math.cos(Deg2Rad(this.phi)) * Math.sin(Deg2Rad(this.theta)),
      Math.sin(Deg2Rad(this.phi)),
      Math.cos(Deg2Rad(this.phi)) * Math.cos(Deg2Rad(this.theta)),
    ])

    this.right = new Float32Array([0.0, 0.0, 0.0])
    vec3.cross(this.right, this.forwards, [0.0, 1.0, 0.0])
    vec3.normalize(this.right, this.right)

    this.up = new Float32Array([0.0, 0.0, 0.0])
    vec3.cross(this.up, this.right, this.forwards)
    vec3.normalize(this.up, this.up)
    this.cameraIsMoving = true
  }

  hasChanged(newPosition: Float32Array, newTheta: number, newPhi: number): boolean {
    return !vec3.equals(this.position, newPosition) || this.theta !== newTheta || this.phi !== newPhi
  }
}
