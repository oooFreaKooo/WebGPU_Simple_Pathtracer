import { vec3 } from "gl-matrix"
import { setTexture } from "./helper"

export const materialDataSize = 8

export class Material {
  shininess: number
  //ambient: vec3
  //diffuse: vec3
  //specular: vec3

  diffusetexture: ImageBitmap

  constructor(diffusetexture?: ImageBitmap, shininess: number = 100.0) {
    this.shininess = shininess
    //this.ambient = ambient
    //this.diffuse = diffuse
    //this.specular = specular

    if (diffusetexture) {
      this.diffusetexture = diffusetexture
    } else {
      setTexture("./img/transparent-square.png").then((diffusetexture) => {
        this.diffusetexture = diffusetexture
      })
    }
  }

  public getShininess(): Float32Array {
    return new Float32Array([this.shininess])
  }

  public getDiffuseTexture(): ImageBitmap {
    return this.diffusetexture
  }

  /*   public getAmbient(): Float32Array {
    return new Float32Array(this.ambient)
  }

  public getDiffuse(): Float32Array {
    return new Float32Array(this.diffuse)
  }

  public getSpecular(): Float32Array {
    return new Float32Array(this.specular)
  }
 */
}
