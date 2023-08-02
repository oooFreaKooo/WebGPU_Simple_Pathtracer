import { Node3d } from "../objects/Node3d"
import { ObjMeshRT } from "./ObjMeshRT"
import { CubeMapMaterial } from "./cube_material"
import { Scene } from "./scene"

export var device: GPUDevice
export var color_buffer: GPUTexture
export var color_buffer_view: GPUTextureView
export var sampler: GPUSampler
export var sceneParameters: GPUBuffer
export var lightBuffer: GPUBuffer
export var sky_texture: CubeMapMaterial

export class Renderer {
  animationFrameId?: number
  private initSuccess: boolean = false
  private context: GPUCanvasContext
  private presentationFormat: GPUTextureFormat
  scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  public async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!canvas) {
      console.log("missing canvas!")
      return false
    }

    const adapter = await navigator.gpu?.requestAdapter()
    device = <GPUDevice>await adapter?.requestDevice()
    this.context = canvas.getContext("webgpu") as GPUCanvasContext

    if (!device) {
      console.log("found no gpu device!")
      return false
    }

    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat() ?? "rgba8unorm"
    this.context.configure({
      device,
      format: this.presentationFormat,
      alphaMode: "opaque",
    })

    color_buffer = device.createTexture({
      size: { width: canvas.width, height: canvas.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })
    color_buffer_view = color_buffer.createView()

    sampler = device.createSampler({
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      maxAnisotropy: 1,
    })

    sceneParameters = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    lightBuffer = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    const skyboxUrls = [
      "./src/assets/textures/skybox/sky_front.png",
      "./src/assets/textures/skybox/sky_back.png",
      "./src/assets/textures/skybox/sky_left.png",
      "./src/assets/textures/skybox/sky_right.png",
      "./src/assets/textures/skybox/sky_bottom.png",
      "./src/assets/textures/skybox/sky_top.png",
    ]
    sky_texture = new CubeMapMaterial()
    await sky_texture.initialize(device, skyboxUrls)

    this.updateCameraBuffer()
    this.updateLightBuffer()

    return (this.initSuccess = true)
  }

  public update() {
    if (!this.initSuccess) return
    this.updateCameraBuffer()
    this.updateLightBuffer()
  }

  public makeNodes(node: Node3d, nodes: Node3d[]) {
    if (node instanceof ObjMeshRT) {
      nodes.push(node)
    }
    for (const child of node.children) {
      this.makeNodes(child, nodes)
    }
  }

  public frame(canvas: HTMLCanvasElement, node: Node3d) {
    if (!this.initSuccess) return

    const commandEncoder = device.createCommandEncoder()
    const textureView = this.context.getCurrentTexture().createView()

    const objMeshNodes: ObjMeshRT[] = []
    this.makeNodes(node, objMeshNodes)

    // Begin the ray tracing pass
    const ray_trace_pass = commandEncoder.beginComputePass()
    for (let child of objMeshNodes) {
      child.drawCombined(ray_trace_pass, canvas)
    }
    ray_trace_pass.end()

    // Begin the render pass
    const renderpass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    })

    for (let child of objMeshNodes) {
      child.drawCombined(renderpass, canvas)
    }
    renderpass.end()

    device.queue.submit([commandEncoder.finish()])
  }

  private updateCameraBuffer() {
    const { position, forwards, right, up } = this.scene.camera
    const cameraData = new Float32Array([
      ...position,
      0.0,
      ...forwards,
      0.0,
      ...right,
      4, // maxBounces
      ...up,
      0.0,
    ])
    device.queue.writeBuffer(sceneParameters, 0, cameraData)
  }

  private updateLightBuffer() {
    const { position, color, intensity } = this.scene.light
    const lightData = new Float32Array([...position, 0.0, ...color, intensity])
    device.queue.writeBuffer(lightBuffer, 0, lightData)
  }

  cleanup() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = undefined
    }
  }
}
