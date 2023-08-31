import { CubeMapMaterial } from "./cube_material"
import raytracer_kernel from "../assets/shaders//raytracer_kernel.wgsl"
import screen_shader from "../assets/shaders/screen_shader.wgsl"
import { Scene } from "./scene"
import { addEventListeners, hexToRgb, updateAmbientLightIntensity } from "../utils/helper"

export class Renderer {
  canvas: HTMLCanvasElement

  // Device/Context objects
  adapter: GPUAdapter
  device: GPUDevice
  context: GPUCanvasContext
  format: GPUTextureFormat

  //Assets
  color_buffer: GPUTexture
  color_buffer_view: GPUTextureView
  accumulation_buffer: GPUTexture
  accumulation_buffer_view: GPUTextureView
  sampler: GPUSampler
  sceneParameters: GPUBuffer
  triangleBuffer: GPUBuffer
  nodeBuffer: GPUBuffer
  triangleIndexBuffer: GPUBuffer
  sky_texture: CubeMapMaterial
  lightBuffer: GPUBuffer
  frameCountBuffer: GPUBuffer

  // Pipeline objects
  ray_tracing_pipeline: GPUComputePipeline
  ray_tracing_bind_group_layout: GPUBindGroupLayout
  ray_tracing_bind_group: GPUBindGroup
  screen_pipeline: GPURenderPipeline
  screen_bind_group_layout: GPUBindGroupLayout
  screen_bind_group: GPUBindGroup

  // Scene to render
  scene: Scene
  frametime: number
  loaded: boolean
  animationFrameId?: number
  RGB: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }
  accumulationCount: number = 0

  constructor(canvas: HTMLCanvasElement, scene: Scene) {
    this.canvas = canvas
    this.scene = scene
  }

  async Initialize() {
    await this.setupDevice()

    await this.makeBindGroupLayouts()

    await this.createAssets()

    await this.makeBindGroups()

    await this.makePipelines()

    this.frametime = 16
    this.loaded = false
    this.render()
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

  async makeBindGroupLayouts() {
    this.ray_tracing_bind_group_layout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
            viewDimension: "2d",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            viewDimension: "cube",
          },
        },
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          sampler: {},
        },
        {
          binding: 7,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 8,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
            viewDimension: "2d",
          },
        },
        {
          binding: 9,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
      ],
    })

    this.screen_bind_group_layout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {},
        },
      ],
    })
  }

  async createAssets() {
    this.color_buffer = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })
    this.color_buffer_view = this.color_buffer.createView()

    this.accumulation_buffer = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })

    this.accumulation_buffer_view = this.accumulation_buffer.createView()

    const samplerDescriptor: GPUSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      maxAnisotropy: 1,
    }
    this.sampler = this.device.createSampler(samplerDescriptor)

    const parameterBufferDescriptor: GPUBufferDescriptor = {
      size: 18 * 6 + 4 + 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.sceneParameters = this.device.createBuffer(parameterBufferDescriptor)

    //console.log("Scene has %d triangles", this.scene.triangles.length)
    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 160 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleBuffer = this.device.createBuffer(triangleBufferDescriptor)

    const nodeBufferDescriptor: GPUBufferDescriptor = {
      size: 32 * this.scene.nodes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.nodeBuffer = this.device.createBuffer(nodeBufferDescriptor)

    const triangleIndexBufferDescriptor: GPUBufferDescriptor = {
      size: 4 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleIndexBuffer = this.device.createBuffer(triangleIndexBufferDescriptor)

    const urls = [
      "./src/assets/textures/skybox/right3.png",
      "./src/assets/textures/skybox/left3.png",
      "./src/assets/textures/skybox/top3.png",
      "./src/assets/textures/skybox/bottom3.png",
      "./src/assets/textures/skybox/front3.png",
      "./src/assets/textures/skybox/back3.png",
    ]

    this.sky_texture = new CubeMapMaterial()
    await this.sky_texture.initialize(this.device, urls)

    //await this.sky_texture.initialize(this.device, "./src/assets/textures/skybox/skybox2.png")

    this.lightBuffer = this.device.createBuffer({
      size: 68,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.frameCountBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
  }

  async makeBindGroups() {
    this.ray_tracing_bind_group = this.device.createBindGroup({
      layout: this.ray_tracing_bind_group_layout,
      entries: [
        {
          binding: 0,
          resource: this.color_buffer_view,
        },
        {
          binding: 1,
          resource: {
            buffer: this.sceneParameters,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.triangleBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.nodeBuffer,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: this.triangleIndexBuffer,
          },
        },
        {
          binding: 5,
          resource: this.sky_texture.view,
        },
        {
          binding: 6,
          resource: this.sky_texture.sampler,
        },
        {
          binding: 7,
          resource: {
            buffer: this.lightBuffer,
          },
        },
        {
          binding: 8,
          resource: this.accumulation_buffer_view,
        },
        {
          binding: 9,
          resource: {
            buffer: this.frameCountBuffer,
          },
        },
      ],
    })

    this.screen_bind_group = this.device.createBindGroup({
      layout: this.screen_bind_group_layout,
      entries: [
        {
          binding: 0,
          resource: this.sampler,
        },
        {
          binding: 1,
          resource: this.color_buffer_view,
        },
        {
          binding: 2,
          resource: this.accumulation_buffer_view,
        },
        {
          binding: 3,
          resource: {
            buffer: this.frameCountBuffer,
          },
        },
      ],
    })
  }

  async makePipelines() {
    const ray_tracing_pipeline_layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.ray_tracing_bind_group_layout],
    })

    this.ray_tracing_pipeline = this.device.createComputePipeline({
      layout: ray_tracing_pipeline_layout,

      compute: {
        module: this.device.createShaderModule({ code: raytracer_kernel }),
        entryPoint: "main",
      },
    })

    const screen_pipeline_layout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.screen_bind_group_layout],
    })

    this.screen_pipeline = this.device.createRenderPipeline({
      layout: screen_pipeline_layout,

      vertex: {
        module: this.device.createShaderModule({
          code: screen_shader,
        }),
        entryPoint: "vert_main",
      },

      fragment: {
        module: this.device.createShaderModule({
          code: screen_shader,
        }),
        entryPoint: "frag_main",
        targets: [
          {
            format: "bgra8unorm",
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    })
  }

  prepareScene() {
    const uploadStart = performance.now()
    const maxBounces: number = 4

    const sceneData = {
      cameraPos: this.scene.camera.position,
      cameraForwards: this.scene.camera.forwards,
      cameraRight: this.scene.camera.right,
      cameraUp: this.scene.camera.up,
      fov: this.scene.camera.fov,
      time: performance.now(),
    }

    this.device.queue.writeBuffer(this.frameCountBuffer, 0, new Float32Array([this.accumulationCount]))

    this.device.queue.writeBuffer(
      this.sceneParameters,
      0,
      new Float32Array([
        sceneData.cameraPos[0],
        sceneData.cameraPos[1],
        sceneData.cameraPos[2],
        0.0,
        sceneData.cameraForwards[0],
        sceneData.cameraForwards[1],
        sceneData.cameraForwards[2],
        0.0,
        sceneData.cameraRight[0],
        sceneData.cameraRight[1],
        sceneData.cameraRight[2],
        0.0,
        sceneData.cameraUp[0],
        sceneData.cameraUp[1],
        sceneData.cameraUp[2],
        sceneData.fov,
        maxBounces,
        sceneData.time,
      ]),
      0,
      18,
    )
    // LIGHT
    document.querySelector<HTMLInputElement>("#light-color")!.addEventListener("input", (event) => {
      const colorValue = (event.target as HTMLInputElement).value
      const rgb = hexToRgb(colorValue)
      this.scene.light.light_color = new Float32Array([rgb.r / 255, rgb.g / 255, rgb.b / 255])
    })

    this.scene.light.intensity = parseFloat(document.querySelector<HTMLInputElement>("#intensity")!.value)
    this.scene.light.size = parseFloat(document.querySelector<HTMLInputElement>("#size")!.value)

    // LIGHT
    const { position, light_color, intensity, size, reach } = this.scene.light
    const lightData = new Float32Array([...position, 0.0, ...light_color, intensity, size, reach])
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData)

    //Write the tlas nodes
    var nodeData_a: Float32Array = new Float32Array(8 * this.scene.nodesUsed)
    for (let i = 0; i < this.scene.nodesUsed; i++) {
      nodeData_a[8 * i] = this.scene.nodes[i].minCorner[0]
      nodeData_a[8 * i + 1] = this.scene.nodes[i].minCorner[1]
      nodeData_a[8 * i + 2] = this.scene.nodes[i].minCorner[2]
      nodeData_a[8 * i + 3] = this.scene.nodes[i].leftChild
      nodeData_a[8 * i + 4] = this.scene.nodes[i].maxCorner[0]
      nodeData_a[8 * i + 5] = this.scene.nodes[i].maxCorner[1]
      nodeData_a[8 * i + 6] = this.scene.nodes[i].maxCorner[2]
      nodeData_a[8 * i + 7] = this.scene.nodes[i].primitiveCount
    }
    this.device.queue.writeBuffer(this.nodeBuffer, 0, nodeData_a, 0, 8 * this.scene.nodesUsed)

    const uploadEnd = performance.now()
    const uploadTimeLabel: HTMLElement = <HTMLElement>document.getElementById("upload-time")
    uploadTimeLabel.innerText = (uploadEnd - uploadStart).toFixed(2).toString()

    // Get the color input elements
    addEventListeners(this)

    if (this.loaded) {
      return
    }
    this.loaded = true

    this.updateTriangleData()

    const triangleIndexData: Float32Array = new Float32Array(this.scene.triangles.length)
    for (let i = 0; i < this.scene.triangles.length; i++) {
      triangleIndexData[i] = this.scene.triangleIndices[i]
    }
    this.device.queue.writeBuffer(this.triangleIndexBuffer, 0, triangleIndexData, 0, this.scene.triangles.length)
  }
  render = () => {
    const start: number = performance.now()
    this.accumulationCount++
    if (this.scene.camera.cameraIsMoving) {
      this.accumulationCount = 0
      this.scene.camera.cameraIsMoving = false
    }

    console.log("accumulationCount: " + this.accumulationCount)
    this.scene.update(this.frametime)

    this.prepareScene()

    const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder()

    commandEncoder.copyTextureToTexture(
      { texture: this.color_buffer },
      { texture: this.accumulation_buffer },
      {
        width: this.canvas.width,
        height: this.canvas.height,
        depthOrArrayLayers: 1,
      },
    )

    const ray_trace_pass: GPUComputePassEncoder = commandEncoder.beginComputePass()
    ray_trace_pass.setPipeline(this.ray_tracing_pipeline)
    ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group)
    ray_trace_pass.dispatchWorkgroups(this.canvas.width / 8, this.canvas.height / 8, 1)
    ray_trace_pass.end()

    const textureView: GPUTextureView = this.context.getCurrentTexture().createView()

    const renderpass: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
          loadOp: "load",
          storeOp: "store",
        },
      ],
    })

    renderpass.setPipeline(this.screen_pipeline)
    renderpass.setBindGroup(0, this.screen_bind_group)
    renderpass.draw(6, 1, 0, 0)

    renderpass.end()

    this.device.queue.submit([commandEncoder.finish()])

    this.device.queue.onSubmittedWorkDone().then(() => {
      const end: number = performance.now()
      this.frametime = end - start

      // Calculate FPS (frame-time) and update the label
      const frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById("frame-time")
      if (frameTimeLabel) {
        const fps: number = 1000 / this.frametime
        frameTimeLabel.innerText = fps.toFixed(2).toString()
      }

      // Update the "render-time" label
      const renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById("render-time")
      if (renderTimeLabel) {
        renderTimeLabel.innerText = this.frametime.toFixed(2).toString()
      }
    })

    requestAnimationFrame(this.render)
  }

  cleanup() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = undefined
    }
  }

  updateTriangleData() {
    const triangleDataSize = 40 // Adjusted size

    const triangleData: Float32Array = new Float32Array(triangleDataSize * this.scene.triangles.length)
    for (let i = 0; i < this.scene.triangles.length; i++) {
      const tri = this.scene.triangles[i]
      for (var corner = 0; corner < 3; corner++) {
        triangleData[triangleDataSize * i + 8 * corner] = this.scene.triangles[i].corners[corner][0]
        triangleData[triangleDataSize * i + 8 * corner + 1] = this.scene.triangles[i].corners[corner][1]
        triangleData[triangleDataSize * i + 8 * corner + 2] = this.scene.triangles[i].corners[corner][2]
        triangleData[triangleDataSize * i + 8 * corner + 3] = 0.0

        triangleData[triangleDataSize * i + 8 * corner + 4] = this.scene.triangles[i].normals[corner][0]
        triangleData[triangleDataSize * i + 8 * corner + 5] = this.scene.triangles[i].normals[corner][1]
        triangleData[triangleDataSize * i + 8 * corner + 6] = this.scene.triangles[i].normals[corner][2]
        triangleData[triangleDataSize * i + 8 * corner + 7] = 0.0
      }

      triangleData[triangleDataSize * i + 24] = tri.material.albedo[0]
      triangleData[triangleDataSize * i + 25] = tri.material.albedo[1]
      triangleData[triangleDataSize * i + 26] = tri.material.albedo[2]
      triangleData[triangleDataSize * i + 27] = 0.0 // Padding

      triangleData[triangleDataSize * i + 28] = tri.material.specular[0]
      triangleData[triangleDataSize * i + 29] = tri.material.specular[1]
      triangleData[triangleDataSize * i + 30] = tri.material.specular[2]
      triangleData[triangleDataSize * i + 31] = 0.0 // Padding

      triangleData[triangleDataSize * i + 32] = tri.material.emission[0]
      triangleData[triangleDataSize * i + 33] = tri.material.emission[1]
      triangleData[triangleDataSize * i + 34] = tri.material.emission[2]
      triangleData[triangleDataSize * i + 35] = tri.material.emissionStrength

      triangleData[triangleDataSize * i + 36] = tri.material.roughness
      triangleData[triangleDataSize * i + 37] = tri.material.specularExponent
      triangleData[triangleDataSize * i + 38] = tri.material.specularHighlight
      triangleData[triangleDataSize * i + 39] = 0.0 // Padding
    }

    this.device.queue.writeBuffer(this.triangleBuffer, 0, triangleData, 0, triangleDataSize * this.scene.triangles.length)
  }
}
