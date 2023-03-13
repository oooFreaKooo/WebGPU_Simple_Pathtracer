import { mat4, vec3 } from "gl-matrix"

export class Camera {
  public x: number = 0
  public y: number = 0
  public z: number = 0

  public rotX: number = 0
  public rotY: number = 0
  public rotZ: number = 0

  public yaw: number = 0 // add the yaw property to the camera

  public fovy: number = (2 * Math.PI) / 5
  public aspect: number = 16 / 9

  public near: number = 0.1
  public far: number = 1000

  public lookAt: vec3 = vec3.create()

  constructor(aspect: number) {
    this.aspect = aspect
  }

  public getViewMatrix(): mat4 {
    let viewMatrix = mat4.create()

    // Compute the forward vector
    const forward = vec3.fromValues(0, -1.5, -1)

    // Rotate the forward vector around the Y-axis by the camera's yaw
    vec3.rotateX(forward, forward, vec3.fromValues(0, 0, 0), this.yaw)

    // Compute the right vector
    const right = vec3.fromValues(1, 0, 0)

    // Compute the up vector
    const up = vec3.create()
    vec3.cross(up, right, forward)

    // Set the lookAt vector to be a point directly below the camera
    const lookAtDistance = 1.0
    vec3.scaleAndAdd(this.lookAt, this.getCameraPosition(), forward, lookAtDistance)

    mat4.lookAt(viewMatrix, this.getCameraPosition(), this.lookAt, up)
    return viewMatrix
  }

  public getProjectionMatrix(): mat4 {
    let projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, this.fovy, this.aspect, this.near, this.far)
    return projectionMatrix
  }

  public getCameraViewProjMatrix(): mat4 {
    const viewProjMatrix = mat4.create()
    const view = this.getViewMatrix()
    const proj = this.getProjectionMatrix()
    mat4.multiply(viewProjMatrix, proj, view)
    return viewProjMatrix
  }

  public getCameraPosition(): vec3 {
    return vec3.fromValues(this.x, this.y, this.z)
  }
  public getCameraEye(): Float32Array {
    const eye = vec3.fromValues(this.x, this.y, this.z)
    return new Float32Array([eye[0], eye[1], eye[2], 1])
  }
}
