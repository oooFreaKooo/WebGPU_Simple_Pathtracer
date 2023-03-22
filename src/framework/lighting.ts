import { vec3 } from "gl-matrix"

export class Light {
  public ambientColor: vec3
  public diffuseColor: Float32Array[]
  public specularColor: Float32Array[]
  public pointLightPositions: Float32Array[]

  constructor(numLights: number, ambientColor: vec3) {
    this.ambientColor = ambientColor
    this.diffuseColor = new Array(numLights)
    this.specularColor = new Array(numLights)
    this.pointLightPositions = new Array(numLights)

    for (let i = 0; i < numLights; i++) {
      this.diffuseColor[i] = new Float32Array(4)
      this.specularColor[i] = new Float32Array(4)
      this.pointLightPositions[i] = new Float32Array(4)
    }
  }

  public setAmbientColor(color: vec3) {
    this.ambientColor = color
  }

  public getAmbientColor(): vec3 {
    return this.ambientColor
  }

  public setDiffuseColor(index: number, color: vec3) {
    this.diffuseColor[index][0] = color[0]
    this.diffuseColor[index][1] = color[1]
    this.diffuseColor[index][2] = color[2]
  }

  public getDiffuseColor(index: number): vec3 {
    const color = this.diffuseColor[index]
    return vec3.fromValues(color[0], color[1], color[2])
  }

  public setSpecularColor(index: number, color: vec3) {
    this.specularColor[index][0] = color[0]
    this.specularColor[index][1] = color[1]
    this.specularColor[index][2] = color[2]
  }

  public getSpecularColor(index: number): vec3 {
    const color = this.specularColor[index]
    return vec3.fromValues(color[0], color[1], color[2])
  }

  public setPointLightPosition(index: number, position: vec3) {
    this.pointLightPositions[index][0] = position[0]
    this.pointLightPositions[index][1] = position[1]
    this.pointLightPositions[index][2] = position[2]
  }

  public getPointLightPosition(index: number): vec3 {
    const position = this.pointLightPositions[index]
    return vec3.fromValues(position[0], position[1], position[2])
  }

  public getNumLights(): number {
    return this.pointLightPositions.length
  }
}
