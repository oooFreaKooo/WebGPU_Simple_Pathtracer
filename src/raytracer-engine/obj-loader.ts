import { vec3, vec2, mat4 } from "gl-matrix"
import { Triangle } from "./triangle"
import { Material } from "./material"
import { Deg2Rad } from "../utils/helper"

const MAX_VALUE = Number.POSITIVE_INFINITY
const MIN_VALUE = Number.NEGATIVE_INFINITY

export class ObjLoader {
  v: vec3[]
  vt: vec2[]
  vn: vec3[]

  triangles: Triangle[]

  minCorner: vec3
  maxCorner: vec3

  material: Material
  model: mat4
  inverseModel: mat4
  position: vec3
  rotation: vec3
  scale: vec3

  constructor(material: Material, position: vec3, scale: vec3, rotation: vec3) {
    this.material = material
    this.v = []
    this.vt = []
    this.vn = []

    this.triangles = []

    this.minCorner = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    this.maxCorner = [MIN_VALUE, MIN_VALUE, MIN_VALUE]

    this.position = position
    this.rotation = rotation
    this.scale = scale
    this.inverseModel = mat4.create()
    this.calculate_transform()
  }

  /*   update(rate: number) {
    this.rotation[2] += rate * 0.5
    if (this.rotation[2] > 360) {
      this.rotation[2] -= 360
    }
    this.calculate_transform()
  } */

  calculate_transform() {
    this.model = mat4.create()
    mat4.translate(this.model, this.model, this.position)
    mat4.rotateZ(this.model, this.model, Deg2Rad(this.rotation[2]))
    mat4.rotateY(this.model, this.model, Deg2Rad(this.rotation[1]))
    mat4.rotateX(this.model, this.model, Deg2Rad(this.rotation[0]))
    mat4.scale(this.model, this.model, this.scale)
    mat4.invert(this.inverseModel, this.model)
  }

  async initialize(url: string) {
    await this.readFile(url)

    this.v = []
    this.vt = []
    this.vn = []
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

  read_vertex_data(line: string) {
    const [, x, y, z] = line.split(" ").map(Number)
    const new_vertex = vec3.transformMat4([x, y, z], [x, y, z], this.model)

    this.v.push(new_vertex)

    vec3.min(this.minCorner, this.minCorner, new_vertex)
    vec3.max(this.maxCorner, this.maxCorner, new_vertex)
  }

  read_texcoord_data(line: string) {
    const [, u, v] = line.split(" ").map(Number)
    this.vt.push([u, v])
  }

  read_normal_data(line: string) {
    const [, nx, ny, nz] = line.split(" ").map(Number)
    this.vn.push([nx, ny, nz])
  }

  read_face_data(line: string) {
    line = line.replace("\n", "")
    const vertex_descriptions = line.split(" ")

    const triangle_count = vertex_descriptions.length - 3
    for (var i = 0; i < triangle_count; i++) {
      var tri: Triangle = new Triangle()
      this.read_corner(vertex_descriptions[1], tri)
      this.read_corner(vertex_descriptions[2 + i], tri)
      this.read_corner(vertex_descriptions[3 + i], tri)
      tri.material = this.material
      tri.make_centroid()
      this.triangles.push(tri)
    }
  }

  read_corner(vertex_description: string, tri: Triangle) {
    const v_vt_vn = vertex_description.split("/")
    const v = this.v[Number(v_vt_vn[0]).valueOf() - 1]
    const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1]
    const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1]
    tri.corners.push(v)
    tri.normals.push(vn)
  }
}
