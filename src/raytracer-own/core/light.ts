import { vec3 } from "gl-matrix"

export class Light {
  position: vec3
  color: vec3
  size: vec3
  intensity: number

  constructor(position: vec3, color: vec3, size: vec3, intensity: number) {
    this.position = position
    this.color = color
    this.size = size
    this.intensity = intensity
  }
}
