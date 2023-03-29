import { Light } from "../framework/lighting"
import { Camera } from "./camera"
import { CreateDepthStencil, CreateUniformBuffer } from "./helper"
import { Node3d } from "./newnode"
import { ObjMesh } from "./obj-mesh"
import { Material } from "./material"
import { vec3 } from "gl-matrix"

export var device: GPUDevice
export var cameraUniformBuffer: GPUBuffer

export var ambientLightBuffer: GPUBuffer
export var diffuseLightBuffer: GPUBuffer
export var positionLightBuffer: GPUBuffer
export var cameraPosBuffer: GPUBuffer
export var materialDataBuffer: GPUBuffer
export var lightDataSize: number

export class Renderer {
  readonly swapChainFormat = "bgra8unorm"
  private initSuccess: boolean = false
  private renderPassDescriptor: GPURenderPassDescriptor

  private context: GPUCanvasContext
  private presentationFormat: GPUTextureFormat
  private presentationSize: number[]

  private matrixSize = 4 * 16 // 4x4 matrix

  constructor() {}

  public async init(canvas: HTMLCanvasElement, numLights: number): Promise<boolean> {
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
    cameraPosBuffer = CreateUniformBuffer(device, 32)
    materialDataBuffer = CreateUniformBuffer(device, 400)

    lightDataSize = numLights * 16
    ambientLightBuffer = CreateUniformBuffer(device, 16)
    diffuseLightBuffer = CreateUniformBuffer(device, lightDataSize)
    positionLightBuffer = CreateUniformBuffer(device, lightDataSize)

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

  public frame(camera: Camera, light: Light, node: Node3d) {
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

    // CAMERA BUFFER
    const eyePosition = camera.getCameraEye()
    device.queue.writeBuffer(cameraPosBuffer, 0, eyePosition.buffer)

    // LIGHT BUFFER
    const ambient = light.getAmbientColor()
    const ambData = new Float32Array([ambient[0], ambient[1], ambient[2]])
    device.queue.writeBuffer(ambientLightBuffer, 0, ambData.buffer)

    let difData = new Float32Array()
    let posData = new Float32Array()

    for (let i = 0; i < light.getNumLights(); i++) {
      let diffuse = light.getDiffuseColor(i)
      let position = light.getPointLightPosition(i)
      difData = new Float32Array([diffuse[0], diffuse[1], diffuse[2]])
      posData = new Float32Array([position[0], position[1], position[2]])

      device.queue.writeBuffer(diffuseLightBuffer, i * 16, difData)
      device.queue.writeBuffer(positionLightBuffer, i * 16, posData)
    }
    document.querySelector("#ambient-light")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value
      ambient[1] = +(e.target as HTMLInputElement).value
      ambient[2] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(ambientLightBuffer, 0, ambData.buffer)
    })
    ;(this.renderPassDescriptor.colorAttachments as [GPURenderPassColorAttachment])[0].view = this.context.getCurrentTexture().createView()

    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor)
    const nodes: Node3d[] = []
    this.makeNodes(node, nodes)

    for (let child of nodes) {
      if (child instanceof ObjMesh) child.draw(passEncoder, device)
    }

    passEncoder.end()
    device.queue.submit([commandEncoder.finish()])
  }

  private depthTextureView() {
    return device
      .createTexture({
        size: this.presentationSize as GPUExtent3DStrict,
        format: "depth24plus-stencil8",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      .createView()
  }

  private updateRenderPassDescriptor() {
    ;(this.renderPassDescriptor.depthStencilAttachment as GPURenderPassDepthStencilAttachment).view = this.depthTextureView()
  }
}
