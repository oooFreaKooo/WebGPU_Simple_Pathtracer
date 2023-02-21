import { mat4 } from "gl-matrix"
import { CreateMaterialGroupLayout, Material } from "./material"
import { CreateDepthStencil, CreatePipeline, CreateStorageBuffer, CreateUniformBuffer, object_types, RenderData } from "./helper"
import { CreateTransformGroupLayout, ObjMesh } from "./obj-loader"
import vertex from "./shaders/vertex.wgsl"
import { CreateLightGroupLayout, Light } from "./light"

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
  objectBuffer: GPUBuffer

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
    //adapter: wrapper around (physical) GPU.
    //Describes features and limits
    this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter()
    //device: wrapper around GPU functionality
    //Function calls are made through the device
    this.device = <GPUDevice>await this.adapter?.requestDevice()
    //context: similar to vulkan instance (or OpenGL context)
    this.context = <GPUCanvasContext>this.canvas.getContext("webgpu")
    this.format = "bgra8unorm"
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    })
  }

  async makeDepthBufferResources() {
    this.depthStencilAttachment = CreateDepthStencil(this.device, this.canvas)
  }

  async makeBindGroupLayouts() {
    this.transformGroupLayout = CreateTransformGroupLayout(this.device)
    this.materialGroupLayout = CreateMaterialGroupLayout(this.device)
    this.lightingGroupLayout = CreateLightGroupLayout(this.device)
  }

  async makePipeline() {
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.transformGroupLayout, this.materialGroupLayout, this.lightingGroupLayout],
    })

    this.pipeline = CreatePipeline(this.device, vertex, vertex, this.format, pipelineLayout)
  }

  async createAssets() {
    // Obj Model
    this.objMesh = new ObjMesh()
    this.objMaterial = new Material()
    // Ground/Quad Model
    this.groundMesh = new ObjMesh()
    this.groundMaterial = new Material()

    this.lighting = new Light()
    await this.lighting.initialize(this.device, this.lightingGroupLayout)

    await this.objMesh.initialize(this.device, "models/Spider.obj")
    await this.groundMesh.initialize(this.device, "models/ground.obj")

    this.uniformBuffer = CreateUniformBuffer(this.device, 64 * 2)
    this.objectBuffer = CreateStorageBuffer(this.device, 64 * 1024)

    await this.objMaterial.initialize(this.device, "img/despacitospidertx.png", this.materialGroupLayout)
    await this.groundMaterial.initialize(this.device, "img/dirt.png", this.materialGroupLayout)
  }

  async makeBindGroup() {
    this.transformBindGroup = this.device.createBindGroup({
      layout: this.transformGroupLayout,
      entries: [
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
      ],
    })
  }

  async render(renderables: RenderData) {
    //make transforms
    const projection = mat4.create()
    mat4.perspective(projection, Math.PI / 4, 1200 / 900, 0.1, 1000) // Projektion, FOV, Größe Bildschirm, near, far

    const view = renderables.view_transform

    this.device.queue.writeBuffer(this.objectBuffer, 0, renderables.model_transforms, 0, renderables.model_transforms.length)
    this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>view)
    this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>projection)

    //command encoder: records draw commands for submission
    const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder()
    //texture view: image view to the color buffer in this case
    const textureView: GPUTextureView = this.context.getCurrentTexture().createView()
    //renderpass: holds draw commands, allocated from command encoder
    const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: this.depthStencilAttachment,
    })
    var objects_drawn: number = 0

    renderpass.setPipeline(this.pipeline)
    renderpass.setBindGroup(0, this.transformBindGroup)
    renderpass.setBindGroup(2, this.lighting.bindGroup)

    //Ground
    renderpass.setVertexBuffer(0, this.groundMesh.vbuffer)
    renderpass.setBindGroup(1, this.groundMaterial.bindGroup)
    renderpass.draw(this.groundMesh.vertexCount, renderables.object_counts[object_types.QUAD], 0, objects_drawn)
    objects_drawn += renderables.object_counts[object_types.QUAD]

    //Object
    renderpass.setVertexBuffer(0, this.objMesh.vbuffer)
    renderpass.setBindGroup(1, this.objMaterial.bindGroup)
    renderpass.draw(this.objMesh.vertexCount, 1, 0, objects_drawn)
    objects_drawn += 1

    renderpass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }
}
