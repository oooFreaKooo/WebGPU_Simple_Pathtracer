import raytracer_kernel from "../utils/raytracer_kernel.wgsl"
import screen_shader from "../utils/screen_shader.wgsl"
import { Scene } from "./scene"
import { Deg2Rad, addEventListeners, linearToSRGB, setTexture } from "../utils/helper"
import { CubeMapMaterial } from "./material"
import { computePass, createRenderPassDescriptor, createVertexBuffer, renderPass } from "../utils/webgpu"

const frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById("frame-time")
const renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById("render-time")

const COMPUTE_WORKGROUP_SIZE_X = 8
const COMPUTE_WORKGROUP_SIZE_Y = 8

export class Renderer {
  private canvas: HTMLCanvasElement

  // Device/Context objects
  private adapter: GPUAdapter
  private device: GPUDevice
  private context: GPUCanvasContext
  private format: GPUTextureFormat

  //Assets
  private vertexBuffer: GPUBuffer
  private uniformBuffer: GPUBuffer
  private frameBuffer: GPUBuffer
  private cameraBuffer: GPUBuffer
  private triangleBuffer: GPUBuffer
  private materialBuffer: GPUBuffer
  private nodeBuffer: GPUBuffer
  private settingsBuffer: GPUBuffer
  private camsettingsBuffer: GPUBuffer
  private triangleIndexBuffer: GPUBuffer
  private imgOutputBuffer: GPUBuffer

  private sky_texture: CubeMapMaterial
  private uniforms: { screenDims: number[]; frameNum: number; resetBuffer: number }
  // Pipeline objects
  private ray_tracing_pipeline: GPUComputePipeline
  private render_output_pipeline: GPURenderPipeline
  private renderPassDescriptor: GPURenderPassDescriptor

  // Scene to render
  scene: Scene
  private frametime: number = 0
  private loaded = false
  private updatedUniformArray: Float32Array

  private renderOutputBindGroup: GPUBindGroup
  private uniformBindGroup: GPUBindGroup
  private frameBufferBindGroup: GPUBindGroup
  private objectBindGroup: GPUBindGroup
  private textureBindGroup: GPUBindGroup
  private frameNum = 0

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
    if (!navigator.gpu.wgslLanguageFeatures.has("readonly_and_readwrite_storage_textures")) {
      throw new Error("Read-only and read-write storage textures are not available")
    }
    // adapter: wrapper around (physical) GPU.
    // Describes features and limits
    this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter({
      powerPreference: "high-performance",
    })
    const requiredLimits = {
      maxStorageBufferBindingSize: 1e9, // 1 GB
      maxComputeWorkgroupStorageSize: 16384, // 16 KB
      maxComputeInvocationsPerWorkgroup: 1024,
      maxComputeWorkgroupSizeX: 256,
      maxComputeWorkgroupSizeY: 256,
      maxComputeWorkgroupSizeZ: 64,
    }

    // device: wrapper around GPU functionality
    // Function calls are made through the device
    this.device = <GPUDevice>await this.adapter.requestDevice({
      requiredLimits, // include the required limits
    })

    // context: similar to Vulkan instance (or OpenGL context)
    this.context = <GPUCanvasContext>this.canvas.getContext("webgpu")
    this.format = "rgba16float"
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: "opaque",
    })
  }

  async createAssets() {
    this.createUniformBuffer()
    this.createImgOutputBuffer()
    this.createFrameBuffer()
    this.createCameraBuffer()
    this.createMaterialBuffer()
    this.createTriangleBuffer()
    this.createNodeBuffer()
    this.createSettingsBuffer()
    this.createTriangleIndexBuffer()
    const vertexData = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    this.vertexBuffer = createVertexBuffer(this.device, vertexData)
    await this.createSkyTexture()
  }

  async makeComputePipeline() {
    this.ray_tracing_pipeline = this.device.createComputePipeline({
      layout: "auto",

      compute: {
        module: this.device.createShaderModule({ code: raytracer_kernel }),
        entryPoint: "main",
        constants: {
          WORKGROUP_SIZE_X: COMPUTE_WORKGROUP_SIZE_X,
          WORKGROUP_SIZE_Y: COMPUTE_WORKGROUP_SIZE_Y,
        },
      },
    })

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.ray_tracing_pipeline.getBindGroupLayout(0),
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
            buffer: this.cameraBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.settingsBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.camsettingsBuffer,
          },
        },
      ],
    })

    // Group 1: Framebuffer
    this.frameBufferBindGroup = this.device.createBindGroup({
      layout: this.ray_tracing_pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.frameBuffer,
          },
        },
      ],
    })

    // Group 2: Object and BVH Data
    this.objectBindGroup = this.device.createBindGroup({
      layout: this.ray_tracing_pipeline.getBindGroupLayout(2),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.triangleBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.nodeBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.triangleIndexBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.materialBuffer,
          },
        },
      ],
    })

    // Group 3: Textures and Samplers
    this.textureBindGroup = this.device.createBindGroup({
      layout: this.ray_tracing_pipeline.getBindGroupLayout(3),
      entries: [
        {
          binding: 0,
          resource: this.sky_texture.view,
        },
        {
          binding: 1,
          resource: this.sky_texture.sampler,
        },
      ],
    })
  }
  async makeRenderPipeline() {
    this.render_output_pipeline = this.device.createRenderPipeline({
      layout: "auto",
      label: "render pipeline",
      vertex: {
        module: this.device.createShaderModule({
          code: screen_shader,
        }),
        entryPoint: "vert_main",
        buffers: [
          {
            arrayStride: 2 * 4, // 2 floats, 4 bytes each
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
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

    this.renderOutputBindGroup = this.device.createBindGroup({
      layout: this.render_output_pipeline.getBindGroupLayout(0),
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
            buffer: this.frameBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.imgOutputBuffer,
          },
        },
      ],
    })

    this.renderPassDescriptor = createRenderPassDescriptor()
  }

  private updateScene() {
    if (this.scene.camera.cameraIsMoving) {
      this.updateCamera()
    }

    addEventListeners(this)

    // Create a Float32Array to hold the updated uniform data
    this.updatedUniformArray = new Float32Array([
      this.uniforms.screenDims[0],
      this.uniforms.screenDims[1],
      this.uniforms.frameNum,
      this.uniforms.resetBuffer,
    ])

    // Write the updated data to the buffer
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.updatedUniformArray)

    if (this.loaded) {
      // everything below will only load once
      return
    }
    this.loaded = true

    this.updateSettings()
    this.updateCamSettings()
    this.updateImgSettings()
    this.updateMaterialData()
    this.updateTriangleData()
    this.updateNodeData()

    const uploadTimeLabel: HTMLElement = <HTMLElement>document.getElementById("triangles")
    uploadTimeLabel.innerText = this.scene.triangles.length.toFixed(2).toString()

    const triangleIndexData: Float32Array = new Float32Array(this.scene.triangles.length)
    for (let i = 0; i < this.scene.triangles.length; i++) {
      triangleIndexData[i] = this.scene.triangleIndices[i]
    }
    this.device.queue.writeBuffer(this.triangleIndexBuffer, 0, triangleIndexData, 0, this.scene.triangles.length)
  }

  async createSkyTexture() {
    let textureID = 0 // 0 = space, 2 = mars, 3 = town, 4 = garden
    const urls = [
      "./src/assets/textures/skybox/right.png",
      "./src/assets/textures/skybox/left.png",
      "./src/assets/textures/skybox/top.png",
      "./src/assets/textures/skybox/bottom.png",
      "./src/assets/textures/skybox/front.png",
      "./src/assets/textures/skybox/back.png",
    ]

    // modifies the urls with the ID
    const modifiedUrls = urls.map((url) => {
      const parts = url.split(".")
      const newUrl = `${parts[0]}${parts[1]}${textureID}.${parts[2]}`
      return newUrl
    })

    this.sky_texture = new CubeMapMaterial()
    await this.sky_texture.initialize(this.device, modifiedUrls)
  }

  private createUniformBuffer() {
    // Set initial uniform values
    this.uniforms = {
      screenDims: [this.canvas.width, this.canvas.height],
      frameNum: 0,
      resetBuffer: 0,
    }

    // Create a Float32Array to hold the uniform data
    let uniformArray = new Float32Array([
      this.uniforms.screenDims[0],
      this.uniforms.screenDims[1],
      this.uniforms.frameNum,
      this.uniforms.resetBuffer,
    ])

    this.uniformBuffer = this.device.createBuffer({
      label: "Uniform buffer",
      size: uniformArray.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformArray)
  }

  private createImgOutputBuffer() {
    const camDescriptor: GPUBufferDescriptor = {
      size: 12,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.imgOutputBuffer = this.device.createBuffer(camDescriptor)
  }

  public updateImgSettings() {
    const camSettings = {
      vignetteStrength: this.scene.vignetteStrength,
      vignetteRadius: this.scene.vignetteRadius,
    }

    this.device.queue.writeBuffer(this.imgOutputBuffer, 0, new Float32Array([camSettings.vignetteStrength, camSettings.vignetteRadius]), 0, 2)
  }
  private createFrameBuffer() {
    let frameNum = new Float32Array(this.canvas.width * this.canvas.height * 4).fill(0)
    this.frameBuffer = this.device.createBuffer({
      label: "Framebuffer",
      size: frameNum.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(this.frameBuffer, 0, frameNum)
  }

  private createTriangleBuffer() {
    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 96 * this.scene.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleBuffer = this.device.createBuffer(triangleBufferDescriptor)
  }

  private updateTriangleData() {
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

  private createMaterialBuffer() {
    const materialBufferDescriptor: GPUBufferDescriptor = {
      size: 144 * this.scene.objectMeshes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.materialBuffer = this.device.createBuffer(materialBufferDescriptor)
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

      // Adding invModelTranspose data to buffer
      for (let j = 0; j < 16; j++) {
        materialData[materialDataSize * i + 20 + j] = mesh.invModelTranspose[j]
      }
    }

    this.device.queue.writeBuffer(this.materialBuffer, 0, materialData, 0, materialDataSize * this.scene.objectMeshes.length)
  }

  private createNodeBuffer() {
    const nodeBufferDescriptor: GPUBufferDescriptor = {
      size: 32 * this.scene.nodesUsed,
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

  updateNodeData() {
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
  }

  private createCameraBuffer() {
    const descriptor: GPUBufferDescriptor = {
      size: 18 * 6,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.cameraBuffer = this.device.createBuffer(descriptor)
  }

  private updateCamera() {
    const sceneData = {
      cameraPos: this.scene.camera.position,
      cameraForwards: this.scene.camera.forwards,
      cameraRight: this.scene.camera.right,
      cameraUp: this.scene.camera.up,
    }

    this.device.queue.writeBuffer(
      this.cameraBuffer,
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
      ]),
      0,
      15,
    )
  }
  private createSettingsBuffer() {
    const camDescriptor: GPUBufferDescriptor = {
      size: 12,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.camsettingsBuffer = this.device.createBuffer(camDescriptor)

    const settingDescriptor: GPUBufferDescriptor = {
      size: 28,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }
    this.settingsBuffer = this.device.createBuffer(settingDescriptor)
  }

  public updateCamSettings() {
    const camSettings = {
      fov: Deg2Rad(this.scene.camera.fov),
      focusDistance: this.scene.camera.focusDistance,
      apertureSize: this.scene.camera.apertureSize,
    }

    this.device.queue.writeBuffer(
      this.camsettingsBuffer,
      0,
      new Float32Array([camSettings.fov, camSettings.focusDistance, camSettings.apertureSize]),
      0,
      3,
    )
  }

  public updateSettings() {
    const settingsData = {
      maxBounces: this.scene.maxBounces,
      samples: this.scene.samples,
      culling: this.scene.enableCulling,
      skytexture: this.scene.enableSkytexture,
      aspectRatio: this.canvas.width / this.canvas.height,
      jitterScale: this.scene.jitterScale,
    }

    this.device.queue.writeBuffer(
      this.settingsBuffer,
      0,
      new Float32Array([
        settingsData.maxBounces,
        settingsData.samples,
        settingsData.culling,
        settingsData.skytexture,
        settingsData.aspectRatio,
        settingsData.jitterScale,
      ]),
      0,
      6,
    )
  }

  totalFrametime = 0
  totalFrames = 0
  requestId: number | null = null

  async renderLoop() {
    const start: number = performance.now()
    // Increment frame number
    this.frameNum += 1
    // Update uniforms
    this.updateScene()

    // Update frame number in uniforms
    this.uniforms.frameNum = this.frameNum

    // Reset buffer if camera moved
    if (this.scene.camera.cameraIsMoving) {
      this.frameNum = 1
      this.uniforms.resetBuffer = 1
      this.scene.camera.cameraIsMoving = false

      this.totalFrametime = 0
      this.totalFrames = 0
    } else {
      this.uniforms.resetBuffer = 0
    }

    // Compute pass
    let workGroupsX = Math.ceil(this.canvas.width / COMPUTE_WORKGROUP_SIZE_X)
    let workGroupsY = Math.ceil(this.canvas.height / COMPUTE_WORKGROUP_SIZE_Y)

    computePass(
      this.device,
      this.ray_tracing_pipeline,
      {
        uniformBindGroup: this.uniformBindGroup,
        frameBufferBindGroup: this.frameBufferBindGroup,
        objectBindGroup: this.objectBindGroup,
        textureBindGroup: this.textureBindGroup,
      },
      workGroupsX,
      workGroupsY,
    )

    // Render pass
    renderPass(this.device, this.context, this.renderPassDescriptor, this.render_output_pipeline, this.renderOutputBindGroup, this.vertexBuffer)

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
      renderTimeLabel.innerText = this.frameNum.toFixed(2).toString()
    }

    this.requestId = requestAnimationFrame(() => this.renderLoop())
  }
}
