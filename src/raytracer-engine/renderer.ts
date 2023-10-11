import { CubeMapMaterial } from "./cube_material"
import raytracer_kernel from "../assets/shaders//raytracer_kernel.wgsl"
import screen_shader from "../assets/shaders/screen_shader.wgsl"
import { Scene } from "./scene"
import { addEventListeners, linearToSRGB } from "../utils/helper"

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
  ray_tracing_bind_group_layout: GPUBindGroupLayout
  ray_tracing_bind_group: GPUBindGroup
  screen_pipeline: GPURenderPipeline
  screen_bind_group_layout: GPUBindGroupLayout
  screen_bind_group: GPUBindGroup
  accumBufferViews: GPUTextureView[]

  // Scene to render
  scene: Scene
  frametime: number = 0
  loaded: boolean
  maxBounces: number = 4
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

    this.loaded = false
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
    this.color_buffer = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: this.format,
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    })
    // We need to ping-pong the accumulation buffers because read-write storage textures are
    // missing and we can't have the same texture bound as both a read texture and storage texture
    var accumBuffers = [
      this.device.createTexture({
        size: [this.canvas.width, this.canvas.height, 1],
        format: this.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      }),
      this.device.createTexture({
        size: [this.canvas.width, this.canvas.height, 1],
        format: this.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
      }),
    ]

    this.accumBufferViews = [accumBuffers[0].createView(), accumBuffers[1].createView()]

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
      size: 18 * 6 + 4 + 4 + 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.sceneParameters = this.device.createBuffer(parameterBufferDescriptor)

    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 224 * this.scene.triangles.length,
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

    this.viewParamsBuffer = this.device.createBuffer({ size: 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.frameCountBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: false,
    })
  }

  async makeBindGroups() {
    this.bindGroupEntries = [
      { binding: 0, resource: this.sampler },
      { binding: 1, resource: this.color_buffer.createView() },
      { binding: 2, resource: { buffer: this.viewParamsBuffer } },
      // Updated each frame because we need to ping pong the accumulation buffers
      { binding: 3, resource: null },
      { binding: 4, resource: null },
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
  }

  prepareScene() {
    const bouncesElement = document.getElementById("bounces")
    if (bouncesElement) {
      bouncesElement.addEventListener("input", (event) => {
        this.maxBounces = parseFloat((<HTMLInputElement>event.target).value)
        this.updateSceneParameters()
      })
    }

    const samplesElement = document.getElementById("samples")
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
    while (true) {
      const start: number = performance.now()
      await this.animationFrame()
      this.scene.update(this.frametime)
      this.prepareScene()

      if (this.scene.camera.cameraIsMoving) {
        this.accumulationCount = 0
        this.scene.camera.cameraIsMoving = false
      }

      const commandEncoder: GPUCommandEncoder = this.device.createCommandEncoder()

      // Raytracing
      const ray_trace_pass: GPUComputePassEncoder = commandEncoder.beginComputePass()
      ray_trace_pass.setPipeline(this.ray_tracing_pipeline)
      ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group)
      ray_trace_pass.dispatchWorkgroups(this.canvas.width / 16, this.canvas.height / 16, 1)
      ray_trace_pass.end()

      {
        await this.frameCountBuffer.mapAsync(GPUMapMode.WRITE)
        var map = this.frameCountBuffer.getMappedRange()
        var u32map = new Uint32Array(map)
        u32map.set([this.accumulationCount], 0)
        this.frameCountBuffer.unmap()
      }

      this.bindGroupEntries[3].resource = this.accumBufferViews[this.accumulationCount % 2]
      this.bindGroupEntries[4].resource = this.accumBufferViews[(this.accumulationCount + 1) % 2]

      const bindGroup = this.device.createBindGroup({
        layout: this.screen_pipeline.getBindGroupLayout(0),
        entries: this.bindGroupEntries as GPUBindGroupEntry[],
      })

      commandEncoder.copyBufferToBuffer(this.frameCountBuffer, 0, this.viewParamsBuffer, 0, 4)
      // Display the denoised result
      renderPassDesc.colorAttachments[0].view = this.context.getCurrentTexture().createView()
      var renderpass = commandEncoder.beginRenderPass(renderPassDesc)
      renderpass.setPipeline(this.screen_pipeline)
      renderpass.setBindGroup(0, bindGroup)
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

      this.accumulationCount++
    }
  }

  animationFrame() {
    return new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        resolve()
      })
    })
  }

  updateTriangleData() {
    const triangleDataSize = 56

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

      triangleData[triangleDataSize * i + 36] = tri.material.smoothness
      triangleData[triangleDataSize * i + 37] = tri.material.specularChance
      triangleData[triangleDataSize * i + 38] = tri.material.ior
      triangleData[triangleDataSize * i + 39] = tri.material.transparency
      // Adding inverseModel data to buffer
      for (let j = 0; j < 16; j++) {
        triangleData[triangleDataSize * i + 40 + j] = tri.inverseModel[j]
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
