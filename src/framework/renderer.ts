import { RenderElement } from "./render-element"
import { Node3d } from "./node-3d"
import { Object3d } from "./object-3d"
import { Camera } from "./camera"
import { CheckWebGPU } from "../examples/helper"
import { mat4 } from "gl-matrix"

export class Renderer {
  public adapter: GPUAdapter
  public device: GPUDevice
  public context: GPUCanvasContext
  public format: GPUTextureFormat
  public commandEncoder: GPUCommandEncoder
  public textureView: any
  public renderPass: any
  public renderPassDescription: any
  public now = performance.now()
  public camera: any

  // Assets
  object3D: Object3d

  // Initialisierung
  public async init(canvas: HTMLCanvasElement) {
    console.log("Init Funktion")
    this.adapter = (await navigator.gpu?.requestAdapter()) as GPUAdapter
    this.device = (await this.adapter?.requestDevice()) as GPUDevice
    this.context = canvas.getContext("webgpu") as GPUCanvasContext
    this.format = "rgba8unorm"

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    })
    this.textureView = this.context.getCurrentTexture().createView()
    const depthTexture = this.device.createTexture({
      size: [canvas.width, canvas.height, 1],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    this.renderPassDescription = {
      colorAttachments: [
        {
          view: this.textureView,
          clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, //background color
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    }
  }

  constructor(private canvas: HTMLCanvasElement) {
    const checkgpu = CheckWebGPU()
    if (checkgpu.includes("Your current browser does not support WebGPU!")) {
      console.log(checkgpu)
      throw "Your current browser does not support WebGPU!"
    }
  }

  public render(node: Node3d, camera: Camera) {
    const renderElements: RenderElement[] = []
    const cameraMat: mat4 = mat4.create()
    mat4.multiply(cameraMat, camera.getproj(), camera.getView())
    this.parseSceneGraphRecursive(node, renderElements, cameraMat)
    this.renderElementList(renderElements, cameraMat)
  }

  public parseSceneGraphRecursive(node: Node3d, renderElements: RenderElement[], camera: mat4) {
    if (node.getUpdateFlag()) {
      node.calcTransformMat()
    }

    if (node instanceof Object3d) {
      const element = new RenderElement(this.format, node, camera)
      renderElements.push(element)
    }

    for (const child of node.children) {
      this.parseSceneGraphRecursive(child, renderElements, camera)
    }
  }

  public renderElementList(elements: RenderElement[], camera: mat4): void {
    this.textureView = this.context.getCurrentTexture().createView()
    this.renderPassDescription.colorAttachments[0].view = this.textureView
    const commandEncoder = this.device.createCommandEncoder()
    const renderPass = commandEncoder.beginRenderPass(this.renderPassDescription as GPURenderPassDescriptor)

    for (const element of elements) {
      renderPass.setPipeline(element.pipeline)
      renderPass.setBindGroup(0, element.vertexBindGroup)
      renderPass.setBindGroup(1, element.lightBindGroup)
      renderPass.setBindGroup(2, element.textureBindGroup)

      renderPass.setVertexBuffer(0, element.object3D.VertexBuffer)
      renderPass.setVertexBuffer(1, element.object3D.TextureBuffer)
      renderPass.setVertexBuffer(2, element.object3D.NormalBuffer)

      renderPass.setIndexBuffer(element.object3D.indexBuffer, "uint32")
      renderPass.drawIndexed(element.indexCount, 1, 0, 0, 0)
    }
    renderPass.end()
    this.device.queue.submit([commandEncoder.finish()])
  }
}
