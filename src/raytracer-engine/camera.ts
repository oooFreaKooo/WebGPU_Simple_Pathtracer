import { mat3, mat4, quat, vec3 } from "gl-matrix"
import { deg2Rad } from "./math"

export class Camera {
  position: vec3
  forwards: vec3
  right: vec3
  up: vec3
  orientation: quat
  projectionMatrix: mat4
  fov: number // Field of View
  aspectRatio: number
  near: number
  far: number

  constructor(position: vec3, fov: number = 45, aspectRatio: number = 16 / 9, near: number = 0.1, far: number = 1000) {
    this.position = position
    this.forwards = vec3.fromValues(0, 0, -1) // Default forward direction
    this.right = vec3.create()
    this.up = vec3.create()
    this.orientation = quat.create()
    this.fov = fov
    this.aspectRatio = aspectRatio
    this.near = near
    this.far = far
    this.projectionMatrix = mat4.create()
    this.recalculateVectors()
    this.updateProjectionMatrix()
  }

  recalculateVectors() {
    this.calculateForwardVector()
    this.calculateRightVector()
    this.calculateUpVector()
  }

  calculateForwardVector() {
    const defaultForward = vec3.fromValues(0, 0, -1)
    vec3.transformQuat(this.forwards, defaultForward, this.orientation)
    vec3.normalize(this.forwards, this.forwards)
  }

  calculateRightVector() {
    const defaultRight = vec3.fromValues(1, 0, 0)
    vec3.transformQuat(this.right, defaultRight, this.orientation)
    vec3.normalize(this.right, this.right)
  }

  calculateUpVector() {
    vec3.cross(this.up, this.right, this.forwards)
    vec3.normalize(this.up, this.up)
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fov, this.aspectRatio, this.near, this.far)
  }

  lookAt(target: vec3) {
    const direction = vec3.create()
    vec3.subtract(direction, target, this.position)
    vec3.normalize(direction, direction)
    this.forwards = direction
    this.recalculateVectors()
  }
}
