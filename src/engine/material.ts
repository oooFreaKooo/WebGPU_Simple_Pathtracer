import { vec3 } from "gl-matrix"
import { MaterialParameter, setTexture } from "./helper"

export class Material {
  private ambient: number
  private diffuse: number
  private specular: number
  private shininess: number

  diffusetexture: ImageBitmap

  constructor(diffusetexture?: ImageBitmap, materialParameter?: MaterialParameter) {
    const ambient = materialParameter?.ambient || 0.2
    const diffuse = materialParameter?.diffuse || 0.2
    const specular = materialParameter?.specular || 0.2
    const shininess = materialParameter?.shininess || 100.0
    this.ambient = ambient
    this.diffuse = diffuse
    this.specular = specular
    this.shininess = shininess

    if (diffusetexture) {
      this.diffusetexture = diffusetexture
    } else {
      setTexture("./img/transparent-square.png").then((diffusetexture) => {
        this.diffusetexture = diffusetexture
      })
    }
  }

  public getDiffuse(): Float32Array {
    return new Float32Array([this.diffuse])
  }

  public getSpecular(): Float32Array {
    return new Float32Array([this.specular])
  }

  public getAmbient(): Float32Array {
    return new Float32Array([this.ambient])
  }

  public getShininess(): Float32Array {
    return new Float32Array([this.shininess])
  }

  public getDiffuseTexture(): ImageBitmap {
    return this.diffusetexture
  }

  /*   public getIsTransparent(): boolean {
    return this.isTransparent
  } */
}

//public isTransparent: boolean = false
