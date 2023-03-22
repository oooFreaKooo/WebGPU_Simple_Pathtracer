import { vec3, mat4, quat } from "gl-matrix"
import { Deg2Rad } from "./helper"

export class Camera {
  position: vec3
  orientation: vec3
  forwards: vec3
  right: vec3
  up: vec3

  public fovy: number = 90
  public aspect: number = 16 / 9
  public near: number = 0.1
  public far: number = 10000

  constructor(position: vec3, theta: number, phi: number) {
    this.position = position
    this.orientation = vec3.fromValues(theta, phi, 0)
    this.forwards = vec3.create()
    this.right = vec3.create()
    this.up = vec3.create()
    this.update()
  }

  update() {
    const theta = this.orientation[0]
    const phi = this.orientation[1]

    this.forwards[0] = Math.sin(theta) * Math.cos(phi)
    this.forwards[1] = Math.sin(phi)
    this.forwards[2] = Math.cos(theta) * Math.cos(phi)
    vec3.normalize(this.forwards, this.forwards)

    vec3.cross(this.right, this.forwards, vec3.fromValues(0, 1, 0))
    vec3.normalize(this.right, this.right)

    vec3.cross(this.up, this.right, this.forwards)
    vec3.normalize(this.up, this.up)
  }

  public getViewMatrix(): mat4 {
    const viewMatrix = mat4.create()
    mat4.lookAt(viewMatrix, this.position, vec3.add(vec3.create(), this.position, this.forwards), this.up)
    return viewMatrix
  }

  public getProjectionMatrix(): mat4 {
    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, this.fovy, this.aspect, this.near, this.far)
    return projectionMatrix
  }

  public getCameraViewProjMatrix(): mat4 {
    const viewMatrix = this.getViewMatrix()
    const projectionMatrix = this.getProjectionMatrix()
    const viewProjMatrix = mat4.create()
    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix)
    return viewProjMatrix
  }

  public getCameraEye(): Float32Array {
    return new Float32Array(this.position)
  }
}
