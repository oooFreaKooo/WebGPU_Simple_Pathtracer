import { Node3d } from "./node-3d"
import { Material } from "../examples/material"
import { CreateGPUBuffer, CreateGPUBufferUint } from "../examples/helper"

export class Object3d extends Node3d {
  public _vertexBuffer: GPUBuffer
  public _indexBuffer: GPUBuffer
  public _normalBuffer: GPUBuffer
  public _uvBuffer: GPUBuffer
  public device: GPUDevice
  public material: Material

  public readonly indexCount

  constructor(device: GPUDevice, vertices: Float32Array, normals: Float32Array, indices: Uint32Array, material: Material, uvData: Float32Array) {
    super()
    this.device = device
    this.indexCount = indices.length
    this.material = material

    this._vertexBuffer = CreateGPUBuffer(device, vertices, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    this._indexBuffer = CreateGPUBufferUint(device, indices, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST)
    this._normalBuffer = CreateGPUBuffer(device, normals, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
    this._uvBuffer = CreateGPUBuffer(device, uvData, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST)
  }

  get TextureBuffer() {
    return this._uvBuffer
  }

  get VertexBuffer() {
    return this._vertexBuffer
  }

  get indexBuffer() {
    return this._indexBuffer
  }

  get NormalBuffer() {
    return this._normalBuffer
  }
}
