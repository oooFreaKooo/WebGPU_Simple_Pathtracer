import { mat3, mat4, quat, vec3 } from "gl-matrix"
import { deg2Rad } from "./math"

export class Camera {
  position: vec3
  forwards: vec3
  right: vec3
  up: vec3
  orientation: quat
  fov: number // Field of View
  aspectRatio: number
  near: number
  far: number
  projectionMatrix: mat4
  roll: number // Roll angle in radians
  isPerspective: boolean

  constructor(position: vec3, fov: number = 45, aspectRatio: number = 16 / 9, near: number = 0.1, far: number = 1000) {
    this.position = position
    this.forwards = vec3.create()
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
    this.roll = 0 // Initialize roll angle to 0
    this.isPerspective = true // Default to perspective view
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

  setOrientationFromPitchYaw(pitch: number, yaw: number) {
    const pitchQuat = quat.fromEuler(quat.create(), pitch, 0, 0)
    const yawQuat = quat.fromEuler(quat.create(), 0, yaw, 0)
    quat.multiply(this.orientation, yawQuat, pitchQuat)
    this.recalculateVectors()
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fov, this.aspectRatio, this.near, this.far)
  }

  lookAt(target: vec3) {
    const direction = vec3.create()
    vec3.subtract(direction, target, this.position)
    vec3.normalize(direction, direction)

    this.setOrientationFromDirection(direction)
  }

  setOrientationFromDirection(direction: vec3) {
    const up = vec3.fromValues(0, 1, 0)
    const right = vec3.create()
    vec3.cross(right, up, direction)
    vec3.normalize(right, right)
    vec3.cross(this.up, direction, right)
    vec3.normalize(this.up, this.up)

    const rotationMatrix = mat4.lookAt(mat4.create(), this.position, vec3.add(vec3.create(), this.position, direction), this.up)
    const rotationMat3 = mat3.create()
    mat3.fromMat4(rotationMat3, rotationMatrix)
    quat.fromMat3(this.orientation, rotationMat3)

    this.recalculateVectors()
  }
  applyRoll(angle: number) {
    const rollQuat = quat.fromEuler(quat.create(), 0, 0, angle)
    quat.multiply(this.orientation, this.orientation, rollQuat)
    this.recalculateVectors()
  }

  resetOrientation() {
    this.orientation = quat.create()
    this.roll = 0
    this.recalculateVectors()
  }

  togglePerspective() {
    if (this.isPerspective) {
      mat4.ortho(this.projectionMatrix, -this.aspectRatio * this.fov, this.aspectRatio * this.fov, -this.fov, this.fov, this.near, this.far)
    } else {
      mat4.perspective(this.projectionMatrix, this.fov, this.aspectRatio, this.near, this.far)
    }
    this.isPerspective = !this.isPerspective
  }
}
