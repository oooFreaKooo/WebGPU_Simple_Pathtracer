import { vec3 } from "gl-matrix"

export class Triangle {
  corners: vec3[]
  normals: vec3[]
  centroid: vec3

  ambient: vec3
  diffuse: vec3
  specular: vec3
  emission: vec3
  shininess: number
  refraction: number
  dissolve: number

  constructor(
    diffuse: vec3 = [1.0, 1.0, 1.0],
    specular: vec3 = [1.0, 1.0, 1.0],
    shininess: number = 35,
    ambient: vec3 = [0.2, 0.2, 0.2], // Default values for ambient
    emission: vec3 = [0, 0, 0], // Default values for emission
    refraction: number = 1.0, // Default value for refraction (air)
    dissolve: number = 1.0, // Default value for dissolve (fully opaque)
  ) {
    this.ambient = ambient
    this.diffuse = diffuse
    this.specular = specular
    this.emission = emission
    this.shininess = shininess
    this.refraction = refraction
    this.dissolve = dissolve
    this.corners = []
    this.normals = []
  }

  make_centroid() {
    this.centroid = [
      (this.corners[0][0] + this.corners[1][0] + this.corners[2][0]) / 3,
      (this.corners[0][1] + this.corners[1][1] + this.corners[2][1]) / 3,
      (this.corners[0][2] + this.corners[1][2] + this.corners[2][2]) / 3,
    ]
  }
}
