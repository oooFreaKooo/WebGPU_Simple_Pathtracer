import { mat4, vec3 } from "gl-matrix"
import { Material } from "./material"

export class Triangle {
  corners: vec3[]
  normals: vec3[]
  centroid: vec3
  material: Material
  inverseModel: mat4

  constructor(material: Material = new Material()) {
    this.corners = []
    this.normals = []
    this.material = material
    this.inverseModel = mat4.create()
  }

  setCorners(corner1: vec3, corner2: vec3, corner3: vec3): void {
    this.corners = [corner1, corner2, corner3]
  }

  calculateNormals(): void {
    const edge1 = vec3.create()
    const edge2 = vec3.create()
    const normal = vec3.create()

    vec3.subtract(edge1, this.corners[1], this.corners[0])
    vec3.subtract(edge2, this.corners[2], this.corners[0])
    vec3.cross(normal, edge1, edge2)
    vec3.normalize(normal, normal)

    this.normals = [normal, normal, normal]
  }

  make_centroid(): void {
    this.centroid = [
      (this.corners[0][0] + this.corners[1][0] + this.corners[2][0]) / 3,
      (this.corners[0][1] + this.corners[1][1] + this.corners[2][1]) / 3,
      (this.corners[0][2] + this.corners[1][2] + this.corners[2][2]) / 3,
    ]
  }
}
