export class Material {
  ambient: number
  diffuse: number
  specular: number
  shininess: number
  reflectivity: number
  refraction: number
  transparency: number

  constructor(
    ambient: number = 0.2,
    diffuse: number = 0.5,
    specular: number = 0.5,
    shininess: number = 35,
    reflectivity: number = 0.0,
    refraction: number = 0.0,
    transparency: number = 0.0,
  ) {
    this.ambient = ambient
    this.diffuse = diffuse
    this.specular = specular
    this.shininess = shininess
    this.reflectivity = reflectivity
    this.refraction = refraction
    this.transparency = transparency
  }

  // Getters
  getAmbient(): number {
    return this.ambient
  }

  getDiffuse(): number {
    return this.diffuse
  }

  getSpecular(): number {
    return this.specular
  }

  getShininess(): number {
    return this.shininess
  }

  getReflectivity(): number {
    return this.reflectivity
  }

  getRefraction(): number {
    return this.refraction
  }

  getTransparency(): number {
    return this.transparency
  }

  // Setters
  setAmbient(ambient: number): void {
    this.ambient = ambient
  }

  setDiffuse(diffuse: number): void {
    this.diffuse = diffuse
  }

  setSpecular(specular: number): void {
    this.specular = specular
  }

  setShininess(shininess: number): void {
    this.shininess = shininess
  }

  setReflectivity(reflectivity: number): void {
    this.reflectivity = reflectivity
  }

  setRefraction(refraction: number): void {
    this.refraction = refraction
  }

  setTransparency(transparency: number): void {
    this.transparency = transparency
  }
}
