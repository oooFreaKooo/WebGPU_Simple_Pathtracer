import { vec3 } from "gl-matrix"

interface MaterialOptions {
  albedo?: vec3
  specular?: vec3
  emission?: vec3
  emissionStrength?: number
  smoothness?: number
}

export class Material {
  albedo: vec3
  specular: vec3
  emission: vec3
  emissionStrength: number
  smoothness: number
  specularExponent: number
  specularHighlight: number

  constructor(options: MaterialOptions = {}) {
    const defaults: MaterialOptions = {
      albedo: [0.8, 0.8, 0.8],
      specular: [0.5, 0.5, 0.5],
      emission: [0.0, 0.0, 0.0],
      emissionStrength: 0.0,
      smoothness: 0.0,
    }

    const finalOptions = { ...defaults, ...options }

    this.albedo = finalOptions.albedo!
    this.specular = finalOptions.specular!
    this.specular = finalOptions.specular!
    this.emission = finalOptions.emission!
    this.emissionStrength = finalOptions.emissionStrength!
    this.smoothness = finalOptions.smoothness!
  }
}
