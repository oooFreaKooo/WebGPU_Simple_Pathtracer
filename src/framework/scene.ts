import { vec3 } from "gl-matrix"
import { ObjMesh } from "../engine/obj-mesh"

export const lightDataSize = 16 + 16 + 16

export class Scene {
  public pointLightPosition = vec3.fromValues(0, 0, 0)
  public lightColor = vec3.fromValues(1.0, 1.0, 1.0)
  public ambientColor = vec3.fromValues(1.0, 1.0, 1.0)
  public ambientIntensity: number = 1.0

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
  public getPointLightColor(): Float32Array {
    return this.lightColor as Float32Array
  }
  public getAmbientColor(): Float32Array {
    return this.ambientColor as Float32Array
  }
  public getAmbietIntensity(): Float32Array {
    return new Float32Array([this.ambientIntensity])
  }
}
