import { vec3 } from "gl-matrix"

export class Triangle {
  corners: vec3[]
  normals: vec3[]
  centroid: vec3

  materialIndex: number

  constructor() {
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
