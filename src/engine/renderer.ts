import { mat4 } from "gl-matrix"
import { CreateMaterialGroupLayout, Material } from "./material"
import { CreateDepthStencil, CreatePipeline, CreateStorageBuffer, CreateUniformBuffer, object_types, RenderData } from "./helper"
import { CreateTransformGroupLayout, ObjMesh } from "./obj-loader"
import vertex from "./shaders/vertex.wgsl"
import { CreateLightGroupLayout, Light } from "./light"
import { Scene } from "../framework/scene"

export class Renderer {
  canvas: HTMLCanvasElement

  // Device/Context objects
  adapter: GPUAdapter
  device: GPUDevice
  context: GPUCanvasContext
  format: GPUTextureFormat

  // Pipeline objects
  vertexShader: GPUShaderModule
  fragmentShader: GPUShaderModule
  uniformBuffer: GPUBuffer
  pipeline: GPURenderPipeline

  transformGroupLayout: GPUBindGroupLayout
  materialGroupLayout: GPUBindGroupLayout
  lightingGroupLayout: GPUBindGroupLayout

  transformBindGroup: GPUBindGroup

  depthStencilAttachment: GPURenderPassDepthStencilAttachment

  // Assets
  objMesh: ObjMesh
  groundMesh: ObjMesh

  objMaterial: Material
  groundMaterial: Material

  lighting: Light
  scene: Scene
  objectBuffer: GPUBuffer
  directionalLight: Float32Array

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async Initialize() {
    await this.setupDevice()
    await this.makeBindGroupLayouts()
    await this.createAssets()
    await this.makeDepthBufferResources()
    await this.makePipeline()
    await this.makeBindGroup()
  }

  async setupDevice() {
    // The adapter is a wrapper around the physical GPU and describes its features and limits.
    this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter()

    // The device is a wrapper around the GPU functionality and is used to make function calls.
    this.device = <GPUDevice>await this.adapter?.requestDevice()
    this.context = <GPUCanvasContext>this.canvas.getContext("webgpu")
    this.format = "bgra8unorm"

    // Configures the context for rendering.
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    })
  }

  async makeDepthBufferResources() {
    // Creates a depth/stencil attachment for the render pass.
    this.depthStencilAttachment = CreateDepthStencil(this.device, this.canvas)
  }

  async makeBindGroupLayouts() {
    // Creates the bind group layouts for the pipeline.
    this.transformGroupLayout = CreateTransformGroupLayout(this.device)
    this.materialGroupLayout = CreateMaterialGroupLayout(this.device)
    this.lightingGroupLayout = CreateLightGroupLayout(this.device)
  }

  async makePipeline() {
    // Creates the pipeline layout with the bind group layouts.
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.transformGroupLayout, this.materialGroupLayout, this.lightingGroupLayout],
    })

    // Creates the pipeline with the pipeline layout.
    this.pipeline = CreatePipeline(this.device, vertex, vertex, this.format, pipelineLayout)
  }

  async createAssets() {
    // Obj Model
    this.objMesh = new ObjMesh()
    await this.objMesh.initialize(this.device, "models/Spider.obj")

    this.objMaterial = new Material()
    await this.objMaterial.initialize(this.device, "img/despacitospidertx.png", this.materialGroupLayout)

    // Ground/Quad Model
    this.groundMesh = new ObjMesh()
    await this.groundMesh.initialize(this.device, "models/ground.obj")

    this.groundMaterial = new Material()
    await this.groundMaterial.initialize(this.device, "img/dirt.png", this.materialGroupLayout)

    // Lighting
    this.lighting = new Light(this.device)
    await this.lighting.initialize(this.lightingGroupLayout)

    // Buffers
    this.uniformBuffer = CreateUniformBuffer(this.device, 64 * 2)
    this.objectBuffer = CreateStorageBuffer(this.device, 64 * 1024)
  }

  async makeBindGroup() {
    const entries = [
      {
        binding: 0,
        resource: {
          buffer: this.uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.objectBuffer,
        },
      },
    ]
    this.transformBindGroup = this.device.createBindGroup({
      layout: this.transformGroupLayout,
      entries,
    })
  }

  async render(renderables: RenderData) {
    if (!this.device || !this.pipeline) {
      return
    }

    const projection = mat4.create()
    mat4.perspective(projection, Math.PI / 4, 1200 / 900, 0.1, 1000)

    const view = renderables.view_transform

    // Update buffers with new data
    this.device.queue.writeBuffer(this.objectBuffer, 0, renderables.model_transforms, 0, renderables.model_transforms.length)
    this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>view)
    this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>projection)

    // Create command encoder and texture view
    const commandEncoder = this.device.createCommandEncoder()
    const textureView = this.context.getCurrentTexture().createView()

    // Begin render pass
    const renderpass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: this.depthStencilAttachment,
    })

    // Set pipeline and bind groups
    renderpass.setPipeline(this.pipeline)
    renderpass.setBindGroup(0, this.transformBindGroup)
    renderpass.setBindGroup(2, this.lighting.bindGroup)

    // Draw ground
    renderpass.setVertexBuffer(0, this.groundMesh.vbuffer)
    renderpass.setBindGroup(1, this.groundMaterial.bindGroup)
    renderpass.draw(this.groundMesh.vertexCount, renderables.object_counts[object_types.QUAD], 0, 0)

    // Draw object
    renderpass.setVertexBuffer(0, this.objMesh.vbuffer)
    renderpass.setBindGroup(1, this.objMaterial.bindGroup)
    renderpass.draw(this.objMesh.vertexCount, 1, 0, renderables.object_counts[object_types.QUAD])

    // End render pass and submit command encoder
    renderpass.end()
    this.device.queue.submit([commandEncoder.finish()])
  }
}
