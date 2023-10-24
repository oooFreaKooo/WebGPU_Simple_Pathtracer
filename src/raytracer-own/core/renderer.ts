import raytracer_kernel from "../utils/raytracer_kernel.wgsl"
import screen_shader from "../utils/screen_shader.wgsl"
import { Scene } from "./scene"
import { addEventListeners, linearToSRGB } from "../utils/helper"
import { CubeMapMaterial } from "./material"

const frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById("frame-time")
const renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById("render-time")
const bouncesElement = document.getElementById("bounces")
const samplesElement = document.getElementById("samples")

export class Renderer {
  private accumBufferViews: GPUTextureView[]
  private accumulationCount: number = 0
  private canvas: HTMLCanvasElement

  // Device/Context objects
  private adapter: GPUAdapter
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat

  //Assets
  private textureA: GPUTexture
  private textureB: GPUTexture
  private sampler: GPUSampler
  private sceneParameters: GPUBuffer
  private triangleBuffer: GPUBuffer
  private materialBuffer: GPUBuffer
  private nodeBuffer: GPUBuffer
  private triangleIndexBuffer: GPUBuffer
  private sky_texture: CubeMapMaterial
  private frameCountBuffer: GPUBuffer
  private viewParamsBuffer: GPUBuffer

  // Pipeline objects
  private ray_tracing_pipeline: GPUComputePipeline
  private ray_tracing_bind_group: GPUBindGroup
  private render_output_pipeline: GPURenderPipeline
  private screen_bind_group: GPUBindGroup
  // Scene to render
  scene: Scene
  private frametime: number = 0
  private loaded = false
  private maxBounces: number = 8
  private samples: number = 1

  private renderOutputBindGroup: GPUBindGroup[]
  private computeBindGroup: GPUBindGroup[]
  constructor(canvas: HTMLCanvasElement, scene: Scene) {
    this.canvas = canvas
    this.scene = scene
  }

  async Initialize() {
    await this.setupDevice()
    await this.createAssets()
    await this.makeComputePipeline()
    await this.makeRenderPipeline()
    await this.renderLoop()
  }

  async setupDevice() {
    // adapter: wrapper around (physical) GPU.
    // Describes features and limits
    this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter()
    if (!this.adapter) {
      throw Error("Couldn't request WebGPU adapter.")
    }

    const requiredLimits: Record<string, number> = {}

    requiredLimits["maxStorageBufferBindingSize"] = 1e9 // 1 GB
    requiredLimits["maxComputeInvocationsPerWorkgroup"] = 1024
    // device: wrapper around GPU functionality
    // Function calls are made through the device
    this.device = <GPUDevice>await this.adapter?.requestDevice({
      requiredLimits, // include the required limits in the requestDevice options
    })

    // context: similar to Vulkan instance (or OpenGL context)
    this.context = <GPUCanvasContext>this.canvas.getContext("webgpu")
    this.format = "rgba16float"
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "premultiplied",
    })
  }

  async createAssets() {
    this.createTextureBuffer()
    this.createSampler()
    this.createSceneParameterBuffer()
    this.createMaterialBuffer()
    this.createTriangleBuffer()
    this.createNodeBuffer()
    this.createTriangleIndexBuffer()
    await this.createSkyTexture()
  }

  async makeComputePipeline() {
    this.ray_tracing_pipeline = this.device.createComputePipeline({
      layout: "auto",

      compute: {
        module: this.device.createShaderModule({ code: raytracer_kernel }),
        entryPoint: "main",
      },
    })

    // Two bind groups to accumulate compute passes
    this.computeBindGroup = [
      this.device.createBindGroup({
        layout: this.ray_tracing_pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: this.textureA.createView(),
          },
          {
            binding: 1,
            resource: this.textureB.createView(),
          },
          {
            binding: 2,
            resource: {
              buffer: this.sceneParameters,
            },
          },
          {
            binding: 3,
            resource: {
              buffer: this.triangleBuffer,
            },
          },
          {
            binding: 4,
            resource: {
              buffer: this.nodeBuffer,
            },
          },
          {
            binding: 5,
            resource: {
              buffer: this.triangleIndexBuffer,
            },
          },
          {
            binding: 6,
            resource: this.sky_texture.view,
          },
          {
            binding: 7,
            resource: this.sky_texture.sampler,
          },
          {
            binding: 8,
            resource: {
              buffer: this.materialBuffer,
            },
          },
        ],
      }),
      this.device.createBindGroup({
        layout: this.ray_tracing_pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: this.textureB.createView(),
          },
          {
            binding: 1,
            resource: this.textureA.createView(),
          },
          {
            binding: 2,
            resource: {
              buffer: this.sceneParameters,
            },
          },
          {
            binding: 3,
            resource: {
              buffer: this.triangleBuffer,
            },
          },
          {
            binding: 4,
            resource: {
              buffer: this.nodeBuffer,
            },
          },
          {
            binding: 5,
            resource: {
              buffer: this.triangleIndexBuffer,
            },
          },
          {
            binding: 6,
            resource: this.sky_texture.view,
          },
          {
            binding: 7,
            resource: this.sky_texture.sampler,
          },
          {
            binding: 8,
            resource: {
              buffer: this.materialBuffer,
            },
          },
        ],
      }),
    ]
  }

  async makeRenderPipeline() {
    this.render_output_pipeline = this.device.createRenderPipeline({
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
    })
    // Two bind groups to render the last accumulated compute pass
    this.renderOutputBindGroup = [
      this.device.createBindGroup({
        layout: this.render_output_pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: this.sampler,
          },
          {
            binding: 1,
            resource: this.textureA.createView(),
          },
        ],
      }),
      this.device.createBindGroup({
        layout: this.render_output_pipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: this.sampler,
          },
          {
            binding: 1,
            resource: this.textureB.createView(),
          },
        ],
      }),
    ]
  }

  private prepareScene() {
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
    this.updateMaterialData()
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

  // Assuming these are class properties
  totalFrametime = 0
  totalFrames = 0
  requestId: number | null = null

  async renderLoop() {
    const start: number = performance.now()
    this.accumulationCount++
    this.prepareScene()

    if (this.scene.camera.cameraIsMoving) {
      this.accumulationCount = 0
      this.scene.camera.cameraIsMoving = false

      this.totalFrametime = 0
      this.totalFrames = 0
    }

    const encoder = this.device.createCommandEncoder()

    // Raytracing
    const ray_trace_pass = encoder.beginComputePass()
    ray_trace_pass.setPipeline(this.ray_tracing_pipeline)
    ray_trace_pass.setBindGroup(0, this.computeBindGroup[this.accumulationCount % 2])
    ray_trace_pass.dispatchWorkgroups(this.canvas.width / 8, this.canvas.height / 8)
    ray_trace_pass.end()

    // Output render
    const renderpass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    })
    renderpass.setPipeline(this.render_output_pipeline)
    renderpass.setBindGroup(0, this.renderOutputBindGroup[this.accumulationCount % 2])
    renderpass.draw(6, 1)
    renderpass.end()

    // Submit the command buffer
    this.device.queue.submit([encoder.finish()])

    await this.device.queue.onSubmittedWorkDone()

    const end: number = performance.now()
    this.frametime = end - start

    // Accumulate frame time and frame count
    this.totalFrametime += this.frametime
    this.totalFrames += 1

    const avgFrametime = this.totalFrametime / this.totalFrames
    const avgFps: number = 1000 / avgFrametime

    if (frameTimeLabel) {
      frameTimeLabel.innerText = avgFps.toFixed(2).toString()
    }
    if (renderTimeLabel) {
      renderTimeLabel.innerText = avgFrametime.toFixed(2).toString()
    }

    this.requestId = requestAnimationFrame(() => this.renderLoop())
  }

  // We need to ping-pong the accumulation buffers because read-write storage textures are
  // missing and we can't have the same texture bound as both a read texture and storage texture
  private createTextureBuffer() {
    // Two textures for ping pong swap to accumulate compute passes
    const textureSize = { width: this.canvas.width, height: this.canvas.height }
    this.textureA = this.device.createTexture({
      size: textureSize,
      format: this.format,
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })

    this.textureB = this.device.createTexture({
      size: textureSize,
      format: this.format,
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    })
  }

  private createSampler() {
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

  private createTriangleBuffer() {
    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 96 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleBuffer = this.device.createBuffer(triangleBufferDescriptor)
  }

  private createMaterialBuffer() {
    const materialBufferDescriptor: GPUBufferDescriptor = {
      size: 144 * this.scene.objectMeshes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.materialBuffer = this.device.createBuffer(materialBufferDescriptor)
  }

  private createNodeBuffer() {
    const nodeBufferDescriptor: GPUBufferDescriptor = {
      size: 32 * this.scene.nodes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.nodeBuffer = this.device.createBuffer(nodeBufferDescriptor)
  }

  private createTriangleIndexBuffer() {
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

  updateTriangleData() {
    const triangleDataSize = 24

    const triangleData: Float32Array = new Float32Array(triangleDataSize * this.scene.triangles.length)
    for (let i = 0; i < this.scene.triangles.length; i++) {
      const tri = this.scene.triangles[i]
      for (var corner = 0; corner < 2; corner++) {
        triangleData[triangleDataSize * i + 8 * corner] = this.scene.triangles[i].corners[corner][0]
        triangleData[triangleDataSize * i + 8 * corner + 1] = this.scene.triangles[i].corners[corner][1]
        triangleData[triangleDataSize * i + 8 * corner + 2] = this.scene.triangles[i].corners[corner][2]
        triangleData[triangleDataSize * i + 8 * corner + 3] = 0.0

        triangleData[triangleDataSize * i + 8 * corner + 4] = this.scene.triangles[i].normals[corner][0]
        triangleData[triangleDataSize * i + 8 * corner + 5] = this.scene.triangles[i].normals[corner][1]
        triangleData[triangleDataSize * i + 8 * corner + 6] = this.scene.triangles[i].normals[corner][2]
        triangleData[triangleDataSize * i + 8 * corner + 7] = 0.0
      }
      triangleData[triangleDataSize * i + 16] = this.scene.triangles[i].corners[2][0]
      triangleData[triangleDataSize * i + 17] = this.scene.triangles[i].corners[2][1]
      triangleData[triangleDataSize * i + 18] = this.scene.triangles[i].corners[2][2]
      triangleData[triangleDataSize * i + 19] = 0.0

      triangleData[triangleDataSize * i + 20] = this.scene.triangles[i].normals[2][0]
      triangleData[triangleDataSize * i + 21] = this.scene.triangles[i].normals[2][1]
      triangleData[triangleDataSize * i + 22] = this.scene.triangles[i].normals[2][2]
      triangleData[triangleDataSize * i + 23] = tri.objectID
    }

    this.device.queue.writeBuffer(this.triangleBuffer, 0, triangleData, 0, triangleDataSize * this.scene.triangles.length)
  }

  private updateMaterialData() {
    const materialDataSize = 36

    const materialData: Float32Array = new Float32Array(materialDataSize * this.scene.objectMeshes.length)
    for (let i = 0; i < this.scene.objectMeshes.length; i++) {
      const mesh = this.scene.objectMeshes[i]

      materialData[materialDataSize * i + 0] = mesh.material.albedo[0]
      materialData[materialDataSize * i + 1] = mesh.material.albedo[1]
      materialData[materialDataSize * i + 2] = mesh.material.albedo[2]
      materialData[materialDataSize * i + 3] = mesh.material.specularChance

      materialData[materialDataSize * i + 4] = mesh.material.specularColor[0]
      materialData[materialDataSize * i + 5] = mesh.material.specularColor[1]
      materialData[materialDataSize * i + 6] = mesh.material.specularColor[2]
      materialData[materialDataSize * i + 7] = mesh.material.specularRoughness

      materialData[materialDataSize * i + 8] = mesh.material.emissionColor[0]
      materialData[materialDataSize * i + 9] = mesh.material.emissionColor[1]
      materialData[materialDataSize * i + 10] = mesh.material.emissionColor[2]
      materialData[materialDataSize * i + 11] = mesh.material.emissionStrength

      materialData[materialDataSize * i + 12] = mesh.material.refractionColor[0]
      materialData[materialDataSize * i + 13] = mesh.material.refractionColor[1]
      materialData[materialDataSize * i + 14] = mesh.material.refractionColor[2]
      materialData[materialDataSize * i + 15] = mesh.material.refractionChance

      materialData[materialDataSize * i + 16] = mesh.material.refractionRoughness
      materialData[materialDataSize * i + 17] = mesh.material.ior
      materialData[materialDataSize * i + 18] = 0.0
      materialData[materialDataSize * i + 19] = 0.0

      // Adding inverseModel data to buffer
      for (let j = 0; j < 16; j++) {
        materialData[materialDataSize * i + 20 + j] = mesh.inverseModel[j]
      }
    }

    this.device.queue.writeBuffer(this.materialBuffer, 0, materialData, 0, materialDataSize * this.scene.objectMeshes.length)
  }

  private createSceneParameterBuffer() {
    const parameterBufferDescriptor: GPUBufferDescriptor = {
      size: 18 * 6 + 4 + 4 + 4 + 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.sceneParameters = this.device.createBuffer(parameterBufferDescriptor)
  }

  private updateSceneParameters() {
    const sceneData = {
      cameraPos: this.scene.camera.position,
      cameraForwards: this.scene.camera.forwards,
      cameraRight: this.scene.camera.right,
      cameraUp: this.scene.camera.up,
      fov: this.scene.camera.fov,
      maxBounces: this.maxBounces,
      time: performance.now(),
      samples: this.samples,
      weight: 1.0 / this.accumulationCount,
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
        sceneData.weight,
      ]),
      0,
      20,
    )
  }
}
