import { vec3, vec2 } from "gl-matrix"
import { CreateGPUBuffer, setTexture } from "./helper"

export class ObjLoader {
  v: vec3[]
  vt: vec2[]
  vn: vec3[]
  vertices: Float32Array
  vertexCount: number

  constructor() {
    this.v = []
    this.vt = []
    this.vn = []
  }

  async initialize(obj_path: string) {
    await this.readFile(obj_path)
    this.vertexCount = this.vertices.length / 8

    return this.vertices
  }

  async readFile(url: string) {
    var results: number[][] = []
    var currentObj: number[] = []

    try {
      const response: Response = await fetch(url)
      const file_contents = await response.text()
      const lines = file_contents.split("\n")

      lines.forEach((line) => {
        if (line.startsWith("o ")) {
          // Start of a new object, add the current one to results and create a new buffer
          if (currentObj.length > 0) {
            results.push(currentObj)
            currentObj = []
          }
        } else if (line.startsWith("v ")) {
          this.read_vertex_data(line)
        } else if (line.startsWith("vt")) {
          this.read_texcoord_data(line)
        } else if (line.startsWith("vn")) {
          this.read_normal_data(line)
        } else if (line.startsWith("f")) {
          this.read_face_data(line, currentObj)
        }
      })

      // Add the last object to the results
      if (currentObj.length > 0) {
        results.push(currentObj)
      }

      // Combine all the object parts into a single buffer
      this.vertices = new Float32Array(results.flat())
    } catch (error) {
      console.error("Error while reading file:", error)
    }
  }

  read_vertex_data(line: string) {
    const [, x, y, z] = line.split(" ").map(parseFloat)
    this.v.push([x, y, z])
  }

  read_texcoord_data(line: string) {
    const [, u, v] = line.split(" ").map(parseFloat)
    this.vt.push([u, v])
  }

  read_normal_data(line: string) {
    const [, nx, ny, nz] = line.split(" ").map(parseFloat)
    this.vn.push([nx, ny, nz])
  }

  read_face_data(line: string, result: number[]) {
    line = line.replace("\n", "")
    const vertex_descriptions = line.split(" ")
    const triangle_count = vertex_descriptions.length - 3 // accounting also for "f"
    for (let i = 0; i < triangle_count; i++) {
      //corner a
      this.read_corner(vertex_descriptions[1], result)
      this.read_corner(vertex_descriptions[2 + i], result)
      this.read_corner(vertex_descriptions[3 + i], result)
    }
  }

  read_corner(vertex_description: string, result: number[]) {
    const [vIndex, vtIndex, vnIndex] = vertex_description.split("/").map(parseFloat)
    const v = this.v[vIndex - 1]
    const vt = this.vt[vtIndex - 1]
    const vn = this.vn[vnIndex - 1]
    result.push(...v)
    result.push(...vt)
    result.push(...vn)
  }

  clear() {
    this.v = []
    this.vt = []
    this.vn = []
    this.vertices = new Float32Array()
    this.vertexCount = 0
  }
}
