export class Material {
  material_color: Float32Array
  diffuse: number
  specular: number
  shininess: number
  reflectivity: number
  refraction: number
  transparency: number

  constructor(
    material_color: Float32Array,
    diffuse: number = 0.5,
    specular: number = 0.5,
    shininess: number = 35,
    reflectivity: number = 0.3,
    refraction: number = 0.2,
    transparency: number = 0.0,
  ) {
    this.material_color = material_color
    this.diffuse = diffuse
    this.specular = specular
    this.shininess = shininess
    this.reflectivity = reflectivity
    this.refraction = refraction
    this.transparency = transparency
  }
}
