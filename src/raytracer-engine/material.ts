import { vec3 } from "gl-matrix"

export class Material {
  ambient: vec3 // Ambient reflectivity (Ka)
  diffuse: vec3 // Diffuse reflectivity (Kd)
  specular: vec3 // Specular reflectivity (Ks)
  emission: vec3 // Emissive color (Ke)
  shininess: number // Specular reflection exponent (Ns)
  refraction: number // Optical density/index of refraction (Ni)
  dissolve: number // Transparency (d)
  smoothness: number

  constructor(
    diffuse: vec3 = [1.0, 1.0, 1.0],
    specular: vec3 = [1.0, 1.0, 1.0],
    shininess: number = 35,
    ambient: vec3 = [0.5, 0.5, 0.5],
    emmision: vec3 = [1.0, 0, 0],
    refraction: number = 0.5,
    dissolve: number = 0.5,
    smoothness: number = 0.5,
  ) {
    this.ambient = ambient
    this.diffuse = diffuse
    this.specular = specular
    this.emission = emmision
    this.shininess = shininess
    this.refraction = refraction
    this.dissolve = dissolve
    this.smoothness = smoothness
  }
}
