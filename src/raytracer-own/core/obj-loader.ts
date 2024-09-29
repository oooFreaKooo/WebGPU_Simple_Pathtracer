import { vec3, vec2 } from "gl-matrix"
import { Triangle } from "./triangle"


const MAX_VALUE = Number.POSITIVE_INFINITY
const MIN_VALUE = Number.NEGATIVE_INFINITY

export class ObjLoader {
  maxCorner: vec3 = vec3.fromValues(MAX_VALUE, MAX_VALUE, MAX_VALUE)
  minCorner: vec3 = vec3.fromValues(MIN_VALUE, MIN_VALUE, MIN_VALUE)

  v: vec3[] = []
  vn: vec3[] = []
  vt: vec2[] = []
  triangles: Triangle[] = []

  async initialize(url: string) {
    await this.readFile(url)
    this.v.length = 0
    this.vt.length = 0
    this.vn.length = 0
  }

  async readFile(url: string) {
    const response = await fetch(url)
    const file_contents = await response.text()
    const lines = file_contents.split("\n")

    lines.forEach((line) => {
      switch (line.substr(0, 2)) {
        case "v ":
          this.read_vertex_data(line)
          break
        case "vt":
          this.read_texcoord_data(line)
          break
        case "vn":
          this.read_normal_data(line)
          break
        case "f ":
          this.read_face_data(line)
          break
      }
    })
  }

  private read_vertex_data(line: string) {
    const parts = line.trim().split(/\s+/).map(Number)
    if (parts.length < 4) return // Invalid vertex line
    const [, x, y, z] = parts
    const new_vertex = vec3.fromValues(x, y, z) // No transformation applied

    this.v.push(new_vertex)
    vec3.min(this.minCorner, this.minCorner, new_vertex)
    vec3.max(this.maxCorner, this.maxCorner, new_vertex)
  }

  private read_texcoord_data(line: string) {
    const parts = line.trim().split(/\s+/).map(Number)
    if (parts.length < 3) return // Invalid texcoord line
    const [, u, v] = parts
    this.vt.push([u, v])
  }

  private read_normal_data(line: string) {
    const parts = line.trim().split(/\s+/).map(Number)
    if (parts.length < 4) return // Invalid normal line
    const [, nx, ny, nz] = parts
    this.vn.push([nx, ny, nz])
  }

  private read_face_data(line: string) {
    const vertex_descriptions = line.trim().split(/\s+/)

    if (vertex_descriptions.length === 4) {
      const tri = new Triangle()
      this.read_corner(vertex_descriptions[1], tri)
      this.read_corner(vertex_descriptions[2], tri)
      this.read_corner(vertex_descriptions[3], tri)
      tri.make_centroid()
      this.triangles.push(tri)
    } else if (vertex_descriptions.length === 5) {
      const tri1 = new Triangle()
      this.read_corner(vertex_descriptions[1], tri1)
      this.read_corner(vertex_descriptions[2], tri1)
      this.read_corner(vertex_descriptions[3], tri1)
      tri1.make_centroid()
      this.triangles.push(tri1)

      const tri2 = new Triangle()
      this.read_corner(vertex_descriptions[1], tri2)
      this.read_corner(vertex_descriptions[3], tri2)
      this.read_corner(vertex_descriptions[4], tri2)
      tri2.make_centroid()
      this.triangles.push(tri2)
    }
  }

  private read_corner(vertex_description: string, tri: Triangle) {
    const indices = vertex_description.split("/").map((v) => parseInt(v, 10) - 1)
    const [vIndex, vtIndex, vnIndex] = indices
    if (vIndex >= 0 && vIndex < this.v.length) {
      tri.corners.push(this.v[vIndex])
    }
    if (vnIndex >= 0 && vnIndex < this.vn.length) {
      tri.normals.push(this.vn[vnIndex])
    }
    // Optionally handle vtIndex if needed
  }
}