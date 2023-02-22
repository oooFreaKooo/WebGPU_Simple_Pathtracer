import { vec3, vec2 } from "gl-matrix"
import { CreateGPUBuffer } from "./helper"

export class ObjMesh {
  vbuffer: GPUBuffer
  bufferLayout: GPUVertexBufferLayout
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

  async initialize(device: GPUDevice, url: string) {
    // x y z u v nx ny nz
    await this.readFile(url)
    this.vertexCount = this.vertices.length / 5

    this.vbuffer = CreateGPUBuffer(device, this.vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)

    //now define the vbuffer layout
    this.bufferLayout = {
      arrayStride: 32,
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3",
          offset: 0,
        },
        {
          shaderLocation: 1,
          format: "float32x2",
          offset: 12,
        },
        {
          shaderLocation: 2,
          format: "float32x3",
          offset: 20,
        },
      ],
    }
  }

  async readFile(url: string) {
    var result: number[] = []

    const response: Response = await fetch(url)
    const blob: Blob = await response.blob()
    const file_contents = await blob.text()
    const lines = file_contents.split("\n")

    lines.forEach((line) => {
      //console.log(line);
      if (line[0] == "v" && line[1] == " ") {
        this.read_vertex_data(line)
      } else if (line[0] == "v" && line[1] == "t") {
        this.read_texcoord_data(line)
      } else if (line[0] == "v" && line[1] == "n") {
        this.read_normal_data(line)
      } else if (line[0] == "f") {
        this.read_face_data(line, result)
      }
    })

    this.vertices = new Float32Array(result)
  }

  read_vertex_data(line: string) {
    const components = line.split(" ")
    // ["v", "x", "y", "z"]
    const new_vertex: vec3 = [Number(components[1]).valueOf(), Number(components[2]).valueOf(), Number(components[3]).valueOf()]

    this.v.push(new_vertex)
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

  read_face_data(line: string, result: number[]) {
    line = line.replace("\n", "")
    const vertex_descriptions = line.split(" ")
    const triangle_count = vertex_descriptions.length - 3 // accounting also for "f"
    for (var i = 0; i < triangle_count; i++) {
      //corner a
      this.read_corner(vertex_descriptions[1], result)
      this.read_corner(vertex_descriptions[2 + i], result)
      this.read_corner(vertex_descriptions[3 + i], result)
    }
  }

  read_corner(vertex_description: string, result: number[]) {
    const v_vt_vn = vertex_description.split("/")
    const v = this.v[Number(v_vt_vn[0]).valueOf() - 1]
    const vt = this.vt[Number(v_vt_vn[1]).valueOf() - 1]
    const vn = this.vn[Number(v_vt_vn[2]).valueOf() - 1]
    result.push(v[0])
    result.push(v[1])
    result.push(v[2])
    result.push(vt[0])
    result.push(vt[1])
    result.push(vn[0])
    result.push(vn[1])
    result.push(vn[2])
  }
}
export const CreateTransformGroupLayout = (device: GPUDevice) => {
  const transformGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
          hasDynamicOffset: false,
        },
      },
    ],
  })
  return transformGroupLayout
}
