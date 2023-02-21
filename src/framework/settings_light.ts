import { vec3 } from "gl-matrix"

export class LightSetup {
  direction: vec3
  ambientIntensity: number
  diffuseIntensity: number
  specularIntensity: number
  eyePosition: vec3

  constructor(direction: vec3, ambientIntensity: number, diffuseIntensity: number, specularIntensity: number, eyePosition: vec3) {
    this.direction = direction
    this.ambientIntensity = ambientIntensity
    this.diffuseIntensity = diffuseIntensity
    this.specularIntensity = specularIntensity
    this.eyePosition = eyePosition
  }
}
