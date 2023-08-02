export class Light {
  position: Float32Array // vec3 representing the position of the light
  color: Float32Array // vec3 representing the color of the light
  intensity: number // Scalar value representing the intensity of the light

  constructor(position: Float32Array, color: Float32Array, intensity: number) {
    this.position = position
    this.color = color
    this.intensity = intensity
  }

  // Getters
  getPosition(): Float32Array {
    return this.position
  }

  getColor(): Float32Array {
    return this.color
  }

  getIntensity(): number {
    return this.intensity
  }

  // Optional: Methods to update light properties if needed
  setPosition(x: number, y: number, z: number) {
    this.position = new Float32Array([x, y, z])
  }

  setColor(r: number, g: number, b: number) {
    this.color = new Float32Array([r, g, b])
  }

  setIntensity(intensity: number) {
    this.intensity = intensity
  }
}
