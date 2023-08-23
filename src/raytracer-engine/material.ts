import { vec3 } from "gl-matrix"

interface MaterialOptions {
  ambient?: vec3
  diffuse?: vec3
  specular?: vec3
  emission?: vec3
  shininess?: number
  refraction?: number
  dissolve?: number
  smoothness?: number
}

export class Material {
  ambient: vec3 // Ambient reflectivity (Ka)
  diffuse: vec3 // Diffuse reflectivity (Kd)
  specular: vec3 // Specular reflectivity (Ks)
  emission: vec3 // Emissive color (Ke)
  shininess: number // Specular reflection exponent (Ns)
  refraction: number // Optical density/index of refraction (Ni)
  dissolve: number // Transparency (d)
  smoothness: number

  constructor(options: MaterialOptions = {}) {
    const defaults: MaterialOptions = {
      ambient: [0.5, 0.5, 0.5],
      diffuse: [1.0, 1.0, 1.0],
      specular: [1.0, 1.0, 1.0],
      emission: [1.0, 0, 0],
      shininess: 35,
      refraction: 0.5,
      dissolve: 0.5,
      smoothness: 0.5,
    }

    const finalOptions = { ...defaults, ...options }

    this.ambient = finalOptions.ambient!
    this.diffuse = finalOptions.diffuse!
    this.specular = finalOptions.specular!
    this.emission = finalOptions.emission!
    this.shininess = finalOptions.shininess!
    this.refraction = finalOptions.refraction!
    this.dissolve = finalOptions.dissolve!
    this.smoothness = finalOptions.smoothness!
  }
}
