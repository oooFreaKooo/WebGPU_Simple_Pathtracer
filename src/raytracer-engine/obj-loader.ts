import { vec3, vec2, mat4 } from "gl-matrix"
import { Triangle } from "./triangle"
import { Material } from "./material"
import { deg2Rad } from "./math"

export class ObjLoader {
  v: vec3[]
  vt: vec2[]
  vn: vec3[]

  objectID: number
  triangles: Triangle[]
  triangleIndices: number[]

  minCorner: vec3
  maxCorner: vec3

  material: Material
  model: mat4
  inverseModel: mat4
  position: vec3
  rotation: vec3
  scale: vec3

  constructor(material: Material, position: vec3, scale: vec3, rotation: vec3, objectID: number) {
    this.material = material
    this.v = []
    this.vt = []
    this.vn = []
    this.objectID = objectID
    this.triangles = []
    this.triangleIndices = []

    this.minCorner = [999999, 999999, 999999]
    this.maxCorner = [-999999, -999999, -999999]

    this.position = position
    this.rotation = rotation
    this.scale = scale
    this.inverseModel = mat4.create()
    this.calculate_transform()
  }

  update(rate: number) {
    this.calculate_transform()
  }

  calculate_transform() {
    this.model = mat4.create()
    mat4.translate(this.model, this.model, this.position)
    mat4.rotateZ(this.model, this.model, deg2Rad(this.rotation[2]))
    mat4.rotateY(this.model, this.model, deg2Rad(this.rotation[1]))
    mat4.rotateX(this.model, this.model, deg2Rad(this.rotation[0]))
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
    const response: Response = await fetch(url)
    const blob: Blob = await response.blob()
    const file_contents = await blob.text()
    const lines = file_contents.split("\n")

    lines.forEach((line) => {
      if (line[0] == "v" && line[1] == " ") {
        this.read_vertex_data(line)
      } else if (line[0] == "v" && line[1] == "t") {
        this.read_texcoord_data(line)
      } else if (line[0] == "v" && line[1] == "n") {
        this.read_normal_data(line)
      } else if (line[0] == "f") {
        this.read_face_data(line)
      }
    })
  }

  read_vertex_data(line: string) {
    const components = line.split(" ")
    // ["v", "x", "y", "z"]
    let new_vertex: vec3 = [Number(components[1]).valueOf(), Number(components[2]).valueOf(), Number(components[3]).valueOf()]

    // Transform the vertex using the model matrix
    new_vertex = vec3.transformMat4(new_vertex, new_vertex, this.model)

    this.v.push(new_vertex)

    vec3.min(this.minCorner, this.minCorner, new_vertex)
    vec3.max(this.maxCorner, this.maxCorner, new_vertex)
  }

  read_texcoord_data(line: string) {
    const components = line.split(" ")
    // ["vt", "u", "v"]
    const new_texcoord: vec2 = [Number(components[1]).valueOf(), Number(components[2]).valueOf()]

    this.vt.push(new_texcoord)
  }

  read_normal_data(line: string) {
    const components = line.split(" ")
    // ["vn", "nx", "ny", "nz"]
    const new_normal: vec3 = [Number(components[1]).valueOf(), Number(components[2]).valueOf(), Number(components[3]).valueOf()]

    this.vn.push(new_normal)
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

      tri.make_centroid()
      tri.material = this.material

      this.triangles.push(tri)
      this.triangleIndices.push(this.triangles.length - 1)
    }
    console.log(this.triangleIndices)
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
