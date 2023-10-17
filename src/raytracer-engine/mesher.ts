import { vec2, vec3 } from "gl-matrix"
import { Triangle } from "./triangle"
import { Material } from "./material"
export class PointCloudMesher {
  pointCloud: vec3[]
  triangles: Triangle[]
  v: vec3[] = []
  vt: vec2[] = [] // Assuming vec2 is a type for 2D vectors.
  vn: vec3[] = []

  constructor(pointCloud: vec3[]) {
    this.pointCloud = pointCloud
    this.triangles = []
  }

  generateTriangles(material: Material): void {
    for (let i = 0; i < this.pointCloud.length - 2; i += 3) {
      const triangle = new Triangle(material)
      triangle.setCorners(this.pointCloud[i], this.pointCloud[i + 1], this.pointCloud[i + 2])
      triangle.calculateNormals()

      // Add vertices to the v array
      this.v.push(this.pointCloud[i], this.pointCloud[i + 1], this.pointCloud[i + 2])

      // Generate texture coordinates (here, I'm using a simple logic based on vertex position)
      this.vt.push([this.pointCloud[i][0], this.pointCloud[i][2]])
      this.vt.push([this.pointCloud[i + 1][0], this.pointCloud[i + 1][2]])
      this.vt.push([this.pointCloud[i + 2][0], this.pointCloud[i + 2][2]])

      // Add normals (assuming triangle.calculateNormals() updates the normals of the triangle)
      this.vn.push(triangle.normals[0], triangle.normals[1], triangle.normals[2])

      triangle.make_centroid()
      this.triangles.push(triangle)
    }
  }
}
