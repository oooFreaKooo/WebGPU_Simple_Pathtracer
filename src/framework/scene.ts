import { vec3 } from "gl-matrix"
import { ObjMesh } from "../engine/obj-mesh"

export const lightDataSize = 4 * 4 // vec3 size in bytes

export class Scene {
  public pointLightPosition = vec3.fromValues(0, 0, 0)

  private objects: ObjMesh[] = []

  public add(object: ObjMesh) {
    this.objects.push(object)
  }

  public getObjects(): ObjMesh[] {
    return this.objects
  }

  public getPointLightPosition(): Float32Array {
    return this.pointLightPosition as Float32Array
  }
}
