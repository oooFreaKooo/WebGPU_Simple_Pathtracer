import { vec3 } from "gl-matrix"

interface MaterialOptions {
  albedo?: vec3 // the color used for diffuse lighting
  specularColor?: vec3 // the color tint of specular reflections
  emissionColor?: vec3 // how much the surface glows
  emissionStrength?: number
  specularRoughness?: number // how rough the specular reflections are
  specularChance?: number // percentage chance of doing a specular reflection
  ior?: number // index of refraction. used by fresnel and refraction.
  refractionChance?: number // percent chance of doing a refractive transmission
  refractionRoughness?: number // how rough the refractive transmissions are
  refractionColor?: vec3 // absorption for beer's law
}

export class Material {
  albedo: vec3
  specularColor: vec3
  emissionColor: vec3
  emissionStrength: number
  specularRoughness: number
  specularChance: number
  ior: number
  refractionChance: number
  refractionRoughness: number
  refractionColor: vec3

  constructor(options: MaterialOptions = {}) {
    const defaults: MaterialOptions = {
      albedo: [0.8, 0.8, 0.8],
      specularColor: [1.0, 1.0, 1.0],
      emissionColor: [0.0, 0.0, 0.0],
      emissionStrength: 0.0,
      specularRoughness: 0.0,
      specularChance: 0.0,
      ior: 1.25,
      refractionChance: 0.0,
      refractionRoughness: 0.0,
      refractionColor: [1.0, 1.0, 1.0],
    }

    const finalOptions = { ...defaults, ...options }

    this.albedo = finalOptions.albedo!
    this.specularColor = finalOptions.specularColor!
    this.emissionColor = finalOptions.emissionColor!
    this.emissionStrength = finalOptions.emissionStrength!
    this.specularRoughness = finalOptions.specularRoughness!
    this.specularChance = finalOptions.specularChance!
    this.ior = finalOptions.ior!
    this.refractionChance = finalOptions.refractionChance!
    this.refractionRoughness = finalOptions.refractionRoughness!
    this.refractionColor = finalOptions.refractionColor!
  }
}
