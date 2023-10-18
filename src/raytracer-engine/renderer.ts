import { CubeMapMaterial } from "./cube_material"
import raytracer_kernel from "../utils/raytracer_kernel.wgsl"
import screen_shader from "../utils/screen_shader.wgsl"
import { Scene } from "./scene"
import { addEventListeners, linearToSRGB } from "../utils/helper"

const frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById("frame-time")
const renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById("render-time")
const bouncesElement = document.getElementById("bounces")
const samplesElement = document.getElementById("samples")

export class Renderer {
  canvas: HTMLCanvasElement

  // Device/Context objects
  adapter: GPUAdapter
  device: GPUDevice
  context: GPUCanvasContext
  format: GPUTextureFormat

  //Assets
  color_buffer: GPUTexture
  accum_buffer_in: GPUTexture
  accum_buffer_out: GPUTexture
  sampler: GPUSampler
  sceneParameters: GPUBuffer
  triangleBuffer: GPUBuffer
  nodeBuffer: GPUBuffer
  triangleIndexBuffer: GPUBuffer
  sky_texture: CubeMapMaterial
  frameCountBuffer: GPUBuffer
  viewParamsBuffer: GPUBuffer

  // Pipeline objects
  ray_tracing_pipeline: GPUComputePipeline
  ray_tracing_bind_group: GPUBindGroup
  screen_pipeline: GPURenderPipeline
  screen_bind_group: GPUBindGroup
  accumBufferViews: GPUTextureView[]

  // Scene to render
  scene: Scene
  frametime: number = 0
  loaded = false
  maxBounces: number = 8
  accumulationCount: number = 0
  samples: number = 1

  bindGroupEntries: (
    | { binding: number; resource: GPUSampler }
    | { binding: number; resource: GPUTextureView }
    | { binding: number; resource: { buffer: GPUBuffer } }
    | { binding: number; resource: null }
  )[]

  constructor(canvas: HTMLCanvasElement, scene: Scene) {
    this.canvas = canvas
    this.scene = scene
  }

  async Initialize() {
    await this.setupDevice()

    await this.createAssets()

    await this.makeBindGroups()

    await this.makePipelines()

    await this.renderLoop()
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
    this.format = "rgba16float"
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    })
  }

  async createAssets() {
    this.createColorBuffer()
    this.createAccumulationBuffers()
    this.createSampler()
    this.createSceneParameterBuffer()
    this.createTriangleBuffer()
    this.createNodeBuffer()
    this.createTriangleIndexBuffer()
    this.createViewAndFrameCountBuffers()
    await this.createSkyTexture()
  }

  async makeBindGroups() {
    this.bindGroupEntries = [
      // Updated each frame because we need to ping pong the accumulation buffers
      { binding: 0, resource: null },
      { binding: 1, resource: null },
    ]
  }

  async makePipelines() {
    this.ray_tracing_pipeline = this.device.createComputePipeline({
      layout: "auto",

      compute: {
        module: this.device.createShaderModule({ code: raytracer_kernel }),
        entryPoint: "main",
      },
    })
    this.ray_tracing_bind_group = this.device.createBindGroup({
      layout: this.ray_tracing_pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.color_buffer.createView(),
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
      ],
    })

    this.screen_pipeline = this.device.createRenderPipeline({
      layout: "auto",

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
            format: this.format,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    })
    this.screen_bind_group = this.device.createBindGroup({
      layout: this.screen_pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.sampler,
        },
        {
          binding: 1,
          resource: this.color_buffer.createView(),
        },
        {
          binding: 2,
          resource: {
            buffer: this.viewParamsBuffer,
          },
        },
      ],
    })
  }

  prepareScene() {
    if (bouncesElement) {
      bouncesElement.addEventListener("input", (event) => {
        this.maxBounces = parseFloat((<HTMLInputElement>event.target).value)
        this.updateSceneParameters()
      })
    }
    if (samplesElement) {
      samplesElement.addEventListener("input", (event) => {
        this.samples = parseFloat((<HTMLInputElement>event.target).value)
        this.updateSceneParameters()
      })
    }

    this.updateSceneParameters()

    addEventListeners(this)

    if (this.loaded) {
      return
    }
    this.loaded = true

    this.updateTriangleData()
    const uploadTimeLabel: HTMLElement = <HTMLElement>document.getElementById("triangles")
    uploadTimeLabel.innerText = this.scene.triangles.length.toFixed(2).toString()
    console.log(this.scene.nodes)
    var nodeData_a: Float32Array = new Float32Array(8 * this.scene.nodesUsed)
    for (let i = 0; i < this.scene.nodesUsed; i++) {
      nodeData_a[8 * i] = this.scene.nodes[i].aabbMin[0]
      nodeData_a[8 * i + 1] = this.scene.nodes[i].aabbMin[1]
      nodeData_a[8 * i + 2] = this.scene.nodes[i].aabbMin[2]
      nodeData_a[8 * i + 3] = this.scene.nodes[i].leftFirst
      nodeData_a[8 * i + 4] = this.scene.nodes[i].aabbMax[0]
      nodeData_a[8 * i + 5] = this.scene.nodes[i].aabbMax[1]
      nodeData_a[8 * i + 6] = this.scene.nodes[i].aabbMax[2]
      nodeData_a[8 * i + 7] = this.scene.nodes[i].triCount
    }
    this.device.queue.writeBuffer(this.nodeBuffer, 0, nodeData_a, 0, 8 * this.scene.nodesUsed)

    const triangleIndexData: Float32Array = new Float32Array(this.scene.triangles.length)
    for (let i = 0; i < this.scene.triangles.length; i++) {
      triangleIndexData[i] = this.scene.triangleIndices[i]
    }
    this.device.queue.writeBuffer(this.triangleIndexBuffer, 0, triangleIndexData, 0, this.scene.triangles.length)
  }

  async renderLoop() {
    var clearColor = linearToSRGB(0.1)
    var renderPassDesc = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
          clearValue: [clearColor, clearColor, clearColor, 1],
        },
      ],
    }
    let totalFrametime = 0
    let totalFrames = 0

    while (true) {
      const start: number = performance.now()
      await this.animationFrame()
      //this.scene.update(this.frametime)
      this.prepareScene()

      if (this.scene.camera.cameraIsMoving) {
        this.accumulationCount = 0
        this.scene.camera.cameraIsMoving = false

        totalFrametime = 0
        totalFrames = 0
      }
      const commandEncoderRaytracing: GPUCommandEncoder = this.device.createCommandEncoder()

      // Raytracing
      const ray_trace_pass: GPUComputePassEncoder = commandEncoderRaytracing.beginComputePass()
      ray_trace_pass.setPipeline(this.ray_tracing_pipeline)
      ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group)
      ray_trace_pass.dispatchWorkgroups(this.canvas.width / 16, this.canvas.height / 16, 1)
      ray_trace_pass.end()

      this.device.queue.submit([commandEncoderRaytracing.finish()])
      await this.device.queue.onSubmittedWorkDone()

      {
        await this.frameCountBuffer.mapAsync(GPUMapMode.WRITE)
        var map = this.frameCountBuffer.getMappedRange()
        var u32map = new Uint32Array(map)
        u32map.set([this.accumulationCount], 0)
        this.frameCountBuffer.unmap()
      }

      this.bindGroupEntries[0].resource = this.accumBufferViews[this.accumulationCount % 2]
      this.bindGroupEntries[1].resource = this.accumBufferViews[(this.accumulationCount + 1) % 2]

      const bindGroup = this.device.createBindGroup({
        layout: this.screen_pipeline.getBindGroupLayout(1),
        entries: this.bindGroupEntries as GPUBindGroupEntry[],
      })

      const commandEncoderScreen: GPUCommandEncoder = this.device.createCommandEncoder()

      // Screen rendering
      commandEncoderScreen.copyBufferToBuffer(this.frameCountBuffer, 0, this.viewParamsBuffer, 0, 4)
      renderPassDesc.colorAttachments[0].view = this.context.getCurrentTexture().createView()
      var renderpass = commandEncoderScreen.beginRenderPass(renderPassDesc)
      renderpass.setPipeline(this.screen_pipeline)
      renderpass.setBindGroup(0, this.screen_bind_group)
      renderpass.setBindGroup(1, bindGroup)
      renderpass.draw(6, 1, 0, 0)
      renderpass.end()

      this.device.queue.submit([commandEncoderScreen.finish()])
      await this.device.queue.onSubmittedWorkDone()

      const end: number = performance.now()
      this.frametime = end - start

      // Accumulate frame time and frame count
      totalFrametime += this.frametime
      totalFrames += 1

      const avgFrametime = totalFrametime / totalFrames
      const avgFps: number = 1000 / avgFrametime

      if (frameTimeLabel) {
        frameTimeLabel.innerText = avgFps.toFixed(2).toString()
      }
      if (renderTimeLabel) {
        renderTimeLabel.innerText = avgFrametime.toFixed(2).toString()
      }

      this.accumulationCount++
    }
  }

  async animationFrame() {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        resolve()
      })
    })
  }

  createColorBuffer() {
    const textureSize = { width: this.canvas.width, height: this.canvas.height }
    this.color_buffer = this.device.createTexture({
      size: textureSize,
      format: this.format,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    })
  }

  createAccumulationBuffers() {
    // We need to ping-pong the accumulation buffers because read-write storage textures are
    // missing and we can't have the same texture bound as both a read texture and storage texture
    const textureSize = [this.canvas.width, this.canvas.height, 1]
    const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING
    const accumBuffers = [
      this.device.createTexture({ size: textureSize, format: this.format, usage }),
      this.device.createTexture({ size: textureSize, format: this.format, usage }),
    ]
    this.accumBufferViews = [accumBuffers[0].createView(), accumBuffers[1].createView()]
  }

  createSampler() {
    const samplerDescriptor: GPUSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      maxAnisotropy: 1,
    }
    this.sampler = this.device.createSampler(samplerDescriptor)
  }

  createSceneParameterBuffer() {
    const parameterBufferDescriptor: GPUBufferDescriptor = {
      size: 18 * 6 + 4 + 4 + 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.sceneParameters = this.device.createBuffer(parameterBufferDescriptor)
  }

  createTriangleBuffer() {
    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 260 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleBuffer = this.device.createBuffer(triangleBufferDescriptor)
  }

  createNodeBuffer() {
    const nodeBufferDescriptor: GPUBufferDescriptor = {
      size: 32 * this.scene.nodes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.nodeBuffer = this.device.createBuffer(nodeBufferDescriptor)
  }

  createTriangleIndexBuffer() {
    const triangleIndexBufferDescriptor: GPUBufferDescriptor = {
      size: 4 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleIndexBuffer = this.device.createBuffer(triangleIndexBufferDescriptor)
  }

  async createSkyTexture() {
    const urls = [
      "./src/assets/textures/skybox/right4.png",
      "./src/assets/textures/skybox/left4.png",
      "./src/assets/textures/skybox/top4.png",
      "./src/assets/textures/skybox/bottom4.png",
      "./src/assets/textures/skybox/front4.png",
      "./src/assets/textures/skybox/back4.png",
    ]
    this.sky_texture = new CubeMapMaterial()
    await this.sky_texture.initialize(this.device, urls)
  }

  createViewAndFrameCountBuffers() {
    this.viewParamsBuffer = this.device.createBuffer({ size: 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.frameCountBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: false,
    })
  }

  updateTriangleData() {
    const triangleDataSize = 44 + 16

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
      triangleData[triangleDataSize * i + 27] = tri.material.specularChance

      triangleData[triangleDataSize * i + 28] = tri.material.specularColor[0]
      triangleData[triangleDataSize * i + 29] = tri.material.specularColor[1]
      triangleData[triangleDataSize * i + 30] = tri.material.specularColor[2]
      triangleData[triangleDataSize * i + 31] = tri.material.specularRoughness

      triangleData[triangleDataSize * i + 32] = tri.material.emissionColor[0]
      triangleData[triangleDataSize * i + 33] = tri.material.emissionColor[1]
      triangleData[triangleDataSize * i + 34] = tri.material.emissionColor[2]
      triangleData[triangleDataSize * i + 35] = tri.material.emissionStrength

      triangleData[triangleDataSize * i + 36] = tri.material.refractionColor[0]
      triangleData[triangleDataSize * i + 37] = tri.material.refractionColor[1]
      triangleData[triangleDataSize * i + 38] = tri.material.refractionColor[2]
      triangleData[triangleDataSize * i + 39] = tri.material.refractionChance

      triangleData[triangleDataSize * i + 40] = tri.material.refractionRoughness
      triangleData[triangleDataSize * i + 41] = tri.material.ior
      triangleData[triangleDataSize * i + 42] = 0.0
      triangleData[triangleDataSize * i + 43] = 0.0

      // Adding inverseModel data to buffer
      for (let j = 0; j < 16; j++) {
        triangleData[triangleDataSize * i + 44 + j] = tri.inverseModel[j]
      }
    }

    this.device.queue.writeBuffer(this.triangleBuffer, 0, triangleData, 0, triangleDataSize * this.scene.triangles.length)
  }
  updateSceneParameters() {
    const sceneData = {
      cameraPos: this.scene.camera.position,
      cameraForwards: this.scene.camera.forwards,
      cameraRight: this.scene.camera.right,
      cameraUp: this.scene.camera.up,
      fov: this.scene.camera.fov,
      maxBounces: this.maxBounces,
      time: performance.now(),
      samples: this.samples,
    }

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
        sceneData.maxBounces,
        sceneData.time,
        sceneData.samples,
      ]),
      0,
      19,
    )
  }
}
