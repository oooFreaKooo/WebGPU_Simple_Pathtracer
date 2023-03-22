import { vec3 } from "gl-matrix"

export class Light {
  public pointLightPositions: Float32Array[]

  constructor(numLights: number) {
    this.pointLightPositions = new Array(numLights)
    for (let i = 0; i < numLights; i++) {
      this.pointLightPositions[i] = new Float32Array(4)
    }
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
