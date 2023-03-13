import { Scene } from "../framework/scene"
import { Camera } from "./camera"
import { lightDataSize } from "../framework/scene"
import { CreateDepthStencil, CreateUniformBuffer } from "./helper"
import { Node3d } from "./newnode"
import { ObjMesh } from "./obj-mesh"
import { materialDataSize } from "./material"

export var device: GPUDevice
export var cameraUniformBuffer: GPUBuffer
export var lightDataBuffer: GPUBuffer
export var materialDataBuffer: GPUBuffer

export class Renderer {
  readonly swapChainFormat = "bgra8unorm"
  private initSuccess: boolean = false
  private renderPassDescriptor: GPURenderPassDescriptor

  private context: GPUCanvasContext
  private presentationFormat: GPUTextureFormat
  private presentationSize: number[]

  private matrixSize = 4 * 16 // 4x4 matrix

  constructor() {}

  public async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!canvas) {
      console.log("missing canvas!")
      return false
    }
    const adapter = <GPUAdapter>await navigator.gpu?.requestAdapter()
    device = <GPUDevice>await adapter?.requestDevice()
    this.context = <GPUCanvasContext>canvas.getContext("webgpu")

    if (!device) {
      console.log("found no gpu device!")
      return false
    }

    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat()
    this.presentationSize = [canvas.clientWidth * devicePixelRatio, canvas.clientHeight * devicePixelRatio]

    this.context.configure({
      device,
      format: this.presentationFormat,
      size: this.presentationSize,
      alphaMode: "opaque",
    })
    const depthstencil = CreateDepthStencil(device, canvas)
    this.renderPassDescriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: depthstencil,
    }

    cameraUniformBuffer = CreateUniformBuffer(device, this.matrixSize)
    lightDataBuffer = CreateUniformBuffer(device, lightDataSize)
    materialDataBuffer = CreateUniformBuffer(device, materialDataSize)

    return (this.initSuccess = true)
  }

  public update(canvas: HTMLCanvasElement) {
    if (!this.initSuccess) {
      return
    }

    this.updateRenderPassDescriptor()
  }

  public makeNodes(node: Node3d, nodes: Node3d[]) {
    if (node instanceof ObjMesh) {
      nodes.push(node)
    }
    for (const child of node.children) {
      this.makeNodes(child, nodes)
    }
  }

  public frame(camera: Camera, scene: Scene, node: Node3d) {
    if (!this.initSuccess) {
      return
    }

    // CAMERA BUFFER
    const cameraViewProjectionMatrix = camera.getCameraViewProjMatrix() as Float32Array
    device.queue.writeBuffer(
      cameraUniformBuffer,
      0,
      cameraViewProjectionMatrix.buffer,
      cameraViewProjectionMatrix.byteOffset,
      cameraViewProjectionMatrix.byteLength,
    )

    // LIGHT BUFFER
    const lightPosition = scene.getPointLightPosition()
    //const lightColor = scene.getPointLightColor()
    const eyePosition = camera.getCameraEye()

    device.queue.writeBuffer(lightDataBuffer, 0, lightPosition.buffer, lightPosition.byteOffset, lightPosition.byteLength)
    //device.queue.writeBuffer(lightDataBuffer, 16, lightColor.buffer, lightColor.byteOffset, lightColor.byteLength)
    device.queue.writeBuffer(lightDataBuffer, 16, eyePosition.buffer, eyePosition.byteOffset, eyePosition.byteLength)
    ;(this.renderPassDescriptor.colorAttachments as [GPURenderPassColorAttachment])[0].view = this.context.getCurrentTexture().createView()

    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor)
    const nodes: Node3d[] = []
    this.makeNodes(node, nodes)

    /*     for (let object of scene.getObjects()) {
      object.draw(passEncoder, device)
    } */

    for (let child of nodes) {
      if (child instanceof ObjMesh) child.draw(passEncoder, device)
    }

    passEncoder.end()
    device.queue.submit([commandEncoder.finish()])
  }

  private depthTextureView() {
    return device
      .createTexture({
        size: this.presentationSize,
        format: "depth24plus-stencil8",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      .createView()
  }

  private updateRenderPassDescriptor() {
    ;(this.renderPassDescriptor.depthStencilAttachment as GPURenderPassDepthStencilAttachment).view = this.depthTextureView()
  }
}
