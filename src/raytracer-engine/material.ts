import { vec3 } from "gl-matrix"

export class Material {
  diffuse: vec3
  specular: vec3
  shininess: number

  constructor(diffuse: vec3 = [1.0, 1.0, 1.0], specular: vec3 = [1.0, 1.0, 1.0], shininess: number = 35) {
    this.diffuse = diffuse
    this.specular = specular
    this.shininess = shininess
  }
}
