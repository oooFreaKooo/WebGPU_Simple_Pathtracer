import { mat4 } from "gl-matrix"
import { Light } from "../framework/lighting"
import { ObjParameter } from "./helper"
import { ObjMesh } from "./obj-mesh"

export class Node3d {
  public children: ObjMesh[] = []
  public lights: Light[] = []
  public parent: Node3d | undefined = undefined
  public x: number = 0
  public y: number = 0
  public z: number = 0
  public rotX: number = 0
  public rotY: number = 0
  public rotZ: number = 0
  public scaleX: number = 1
  public scaleY: number = 1
  public scaleZ: number = 1

  constructor(params: ObjParameter = {}) {
    this.x = params.x || 0
    this.y = params.y || 0
    this.z = params.z || 0
    this.rotX = params.rotX || 0
    this.rotY = params.rotY || 0
    this.rotZ = params.rotZ || 0
    this.scaleX = params.scaleX || 1
    this.scaleY = params.scaleY || 1
    this.scaleZ = params.scaleZ || 1
  }

  public attach(child: ObjMesh): void {
    if (child.parent) {
      child.parent.detach(child)
    }

    child.parent = this
    this.children.push(child)
  }

  public detach(child: ObjMesh): void {
    const index = this.children.indexOf(child)

    if (index !== -1) {
      this.children.splice(index, 1)
      child.parent = undefined
    }
  }

  public rotate(x: number, y: number, z: number): void {
    this.rotX += x
    this.rotY += y
    this.rotZ += z

    for (const child of this.children) {
      child.rotX += x
      child.rotY += y
      child.rotZ += z
    }
  }

  public translate(x: number, y: number, z: number): void {
    this.x += x
    this.y += y
    this.z += z

    for (const child of this.children) {
      child.x += x
      child.y += y
      child.z += z
    }
  }

  public scale(x: number, y: number, z: number): void {
    this.scaleX *= x
    this.scaleY *= y
    this.scaleZ *= z

    for (const child of this.children) {
      child.scaleX *= x
      child.scaleY *= y
      child.scaleZ *= z
    }
  }
}
