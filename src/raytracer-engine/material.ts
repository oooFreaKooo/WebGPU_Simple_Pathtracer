import { vec3 } from "gl-matrix"

interface MaterialOptions {
  albedo?: vec3
  specular?: vec3
  emission?: vec3
  emissionStrength?: number
  smoothness?: number
  specularChance?: number
  ior?: number // Index of Refraction
  transparency?: number // Amount of transparency (0.0 for opaque, 1.0 for fully transparent)
}

export class Material {
  albedo: vec3
  specular: vec3
  emission: vec3
  emissionStrength: number
  smoothness: number
  specularChance: number
  ior: number // Index of Refraction
  transparency: number // Amount of transparency

  constructor(options: MaterialOptions = {}) {
    const defaults: MaterialOptions = {
      albedo: [1.0, 1.0, 1.0],
      specular: [1.0, 1.0, 1.0],
      emission: [0.0, 0.0, 0.0],
      emissionStrength: 0.0,
      smoothness: 0.0,
      specularChance: 0.0,
      ior: 1.0, // Default value for Index of Refraction (like air)
      transparency: 0.0, // Default value for transparency (opaque)
    }

    const finalOptions = { ...defaults, ...options }

    this.albedo = finalOptions.albedo!
    this.specular = finalOptions.specular!
    this.emission = finalOptions.emission!
    this.emissionStrength = finalOptions.emissionStrength!
    this.smoothness = finalOptions.smoothness!
    this.specularChance = finalOptions.specularChance!
    this.ior = finalOptions.ior!
    this.transparency = finalOptions.transparency!
  }
}
