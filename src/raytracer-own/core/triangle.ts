import { vec2, vec3 } from "gl-matrix"

export class Triangle {
  centroid: vec3
  corners: vec3[]
  normals: vec3[]
  texCoords: vec2[]
  materialIndex: number
  objectID: number
  constructor(objectID: number = 0) {
    this.corners = []
    this.normals = []
    this.texCoords = []
    this.objectID = objectID
    this.materialIndex = 0
  }

  make_centroid(): void {
    this.centroid = [
      (this.corners[0][0] + this.corners[1][0] + this.corners[2][0]) / 3,
      (this.corners[0][1] + this.corners[1][1] + this.corners[2][1]) / 3,
      (this.corners[0][2] + this.corners[1][2] + this.corners[2][2]) / 3,
    ]
  }
}
