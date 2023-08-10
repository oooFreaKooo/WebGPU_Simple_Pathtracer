export class Light {
  position: Float32Array
  light_color: Float32Array
  ambient: Float32Array
  intensity: number
  size: number

  constructor(
    position: Float32Array,
    light_color: Float32Array = new Float32Array([1.0, 1.0, 1.0]),
    ambient: Float32Array = new Float32Array([0.3, 0.3, 0.3]),
    intensity: number = 2.0,
    size: number = 1.0,
  ) {
    this.position = position
    this.light_color = light_color
    this.ambient = ambient
    this.intensity = intensity
    this.size = size
  }
}
