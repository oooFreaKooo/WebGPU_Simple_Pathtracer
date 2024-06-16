import { mat4, vec3 } from "gl-matrix"
import { Deg2Rad } from "../utils/helper"

export class Camera {
  cameraIsMoving: boolean = false
  forwards: Float32Array
  fov: number = 135
  phi: number
  position: Float32Array
  right: Float32Array
  theta: number
  up: Float32Array
  constructor(position: number[]) {
    this.position = new Float32Array(position)
    this.theta = 0.0
    this.phi = 0.0
    this.recalculate_vectors()
  }

  // checks if the camera has moved
  hasChanged(newPosition: Float32Array, newTheta: number, newPhi: number): boolean {
    return !vec3.equals(this.position, newPosition) || this.theta !== newTheta || this.phi !== newPhi
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

    // camera is only moving when this method is called (resets accumulation: see renderer)
    this.cameraIsMoving = true
  }
}
