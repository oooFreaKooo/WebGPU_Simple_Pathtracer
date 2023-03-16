import { vec3 } from "gl-matrix"

export const lightDataSize = 80

export class Light {
  public pointLightPositions: Float32Array[]

  constructor(numLights: number) {
    this.pointLightPositions = new Array(numLights)
    for (let i = 0; i < numLights; i++) {
      this.pointLightPositions[i] = new Float32Array(3)
    }
  }

  public setPointLightPosition(index: number, position: vec3): void {
    const x = position[0]
    const y = position[1]
    const z = position[2]
    this.pointLightPositions[index][0] = x
    this.pointLightPositions[index][1] = y
    this.pointLightPositions[index][2] = z
  }

  public getPointLightPosition(index: number): { x: number; y: number; z: number } {
    const position = this.pointLightPositions[index]
    return { x: position[0], y: position[1], z: position[2] }
  }
}
