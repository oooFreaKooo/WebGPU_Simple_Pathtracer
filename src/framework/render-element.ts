import { mat4, vec3 } from "gl-matrix"
import { Object3d } from "./object-3d"
import { Material } from "../examples/material"
import { CreateStorageBuffer, CreateUniformBuffer, CreatePipeline } from "../examples/helper"
import { Camera } from "./camera"

export class RenderElement {
  //Device/Context objects
  public device: GPUDevice
  public format: GPUTextureFormat

  // Pipeline objects
  public pipeline: GPURenderPipeline
  public lightBindGroup: GPUBindGroup
  public vertexBindGroup: GPUBindGroup
  public textureBindGroup: GPUBindGroup
  public shadowBindGroup: GPUBindGroup
  public transformBuffer: GPUBuffer

  public readonly vertexCount
  public readonly indexCount

  // Assets
  object3D: Object3d

  constructor(format: GPUTextureFormat, object: Object3d, public camera: mat4) {
    this.device = object.device
    this.format = format
    this.object3D = object
    this.makePipeline()
    this.vertexCount = object.vertexCount
    this.indexCount = object.indexCount
  }
  // create pipeline
  public async makePipeline() {
    const material = new Material(this.device)
    const materialUniform = this.object3D.material
    const lightUniform = this.object3D.material

    ///// Transform Buffer
    const transformUniform: mat4 = mat4.create()
    mat4.multiply(transformUniform, this.camera, this.object3D.calcWorldTransMatrix())
    this.transformBuffer = CreateUniformBuffer(this.device, 64)
    this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform)

    // PIPELINE
    this.pipeline = CreatePipeline(this.device, material.vertexShader, material.fragmentShader, this.format)

    this.vertexBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: materialUniform.modelViewBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.transformBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: materialUniform.colorBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: materialUniform.lightProjectionBuffer,
          },
        },
      ],
    })

    // create a bind group with texture, sampler, and UV coordinates
    this.textureBindGroup = this.device.createBindGroup({
      label: "Texture Group with Texture/Sampler",
      layout: this.pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: materialUniform.sampler,
        },
        {
          binding: 1,
          resource: materialUniform.texture.createView(),
        },
      ],
    })

    this.lightBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(2),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: lightUniform.ambientBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: lightUniform.pointBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: lightUniform.directionalBuffer,
          },
        },
      ],
    })

    // create a bind group with texture, sampler, and UV coordinates
    this.shadowBindGroup = this.device.createBindGroup({
      label: "Texture Group with Texture/Sampler",
      layout: this.pipeline.getBindGroupLayout(3),
      entries: [
        {
          binding: 0,
          resource: materialUniform.shadowDepthView,
        },
        {
          binding: 1,
          resource: this.device.createSampler({
            compare: "less",
          }),
        },
      ],
    })
  }
}
