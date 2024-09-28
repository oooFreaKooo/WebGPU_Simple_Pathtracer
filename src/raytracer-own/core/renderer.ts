import raytracer_kernel from "../utils/raytracer_kernel.wgsl"
import screen_shader from "../utils/screen_shader.wgsl"
import { Scene } from "./scene"
import { Deg2Rad, addEventListeners, linearToSRGB, setTexture } from "../utils/helper"
import { CubeMapMaterial } from "./material"
import { computePass, createRenderPassDescriptor, createVertexBuffer, renderPass } from "../utils/webgpu"
import { Triangle } from "./triangle"
import { BLAS, BLASNode } from "./bvh/blas"
import { Node } from "./node";
import { TLASNode } from "./bvh/tlas"
import { BLASInstance } from "./bvh/blas-instance"

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
  private materialBuffer: GPUBuffer

  private nodeBufferBlas: GPUBuffer;
  private allBlasNodes: BLASNode[] = [];
  private nodeBufferTlas: GPUBuffer;
  private tlasNodes: TLASNode[];
  private blasInstanceBuffer: GPUBuffer;
  private blasInstances: BLASInstance[];

  private triangleBuffer: GPUBuffer
  private allTriangles: Triangle[] = [];
  private blasTriangleOffsets: Map<BLAS, number> = new Map();
  private triangleIndexBuffer: GPUBuffer
  private allTriangleIndices: Uint32Array;
  private blasTriangleIndexOffsets: Map<BLAS, number> = new Map();

  private settingsBuffer: GPUBuffer
  private camsettingsBuffer: GPUBuffer
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
    if (!this.adapter) {
      throw Error("Couldn't request WebGPU adapter.")
    }
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
    this.createBlasNodeBuffer()
    this.createTlasNodeBuffer()
    this.createBlasInstanceBuffer()
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
            buffer: this.nodeBufferBlas,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.blasInstanceBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.nodeBufferTlas,
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
    this.updateBlasNodeData()
    this.updateTlasNodeData()
    this.updateBlasInstanceData()

    // Update the triangle count label
    const uploadTimeLabel = document.getElementById("triangles") as HTMLElement;
    uploadTimeLabel.innerText = this.allTriangles.length.toString();

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
    // Collect all triangles from all BLASes
    let triangleOffset = 0;
    for (const blas of this.scene.blasArray) {
      this.blasTriangleOffsets.set(blas, triangleOffset);
      this.allTriangles.push(...blas.m_triangles);
      triangleOffset += blas.m_triangles.length;
    }

    const triangleSize = 96; // Each Triangle is 96 bytes (24 floats * 4 bytes)
    const bufferSize = triangleSize * this.allTriangles.length;

    this.triangleBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private updateTriangleData() {
    const triangleDataSize = 24; // 24 floats per triangle (3 corners * 2 attributes (position and normal) * 4 components)
    const triangleData = new Float32Array(triangleDataSize * this.allTriangles.length);

    for (let i = 0; i < this.allTriangles.length; i++) {
      const tri = this.allTriangles[i];
      const baseIndex = triangleDataSize * i;

      // Corner 0
      triangleData[baseIndex + 0] = tri.corners[0][0];
      triangleData[baseIndex + 1] = tri.corners[0][1];
      triangleData[baseIndex + 2] = tri.corners[0][2];
      triangleData[baseIndex + 3] = 0.0; // Padding

      triangleData[baseIndex + 4] = tri.normals[0][0];
      triangleData[baseIndex + 5] = tri.normals[0][1];
      triangleData[baseIndex + 6] = tri.normals[0][2];
      triangleData[baseIndex + 7] = 0.0; // Padding

      // Corner 1
      triangleData[baseIndex + 8] = tri.corners[1][0];
      triangleData[baseIndex + 9] = tri.corners[1][1];
      triangleData[baseIndex + 10] = tri.corners[1][2];
      triangleData[baseIndex + 11] = 0.0; // Padding

      triangleData[baseIndex + 12] = tri.normals[1][0];
      triangleData[baseIndex + 13] = tri.normals[1][1];
      triangleData[baseIndex + 14] = tri.normals[1][2];
      triangleData[baseIndex + 15] = 0.0; // Padding

      // Corner 2
      triangleData[baseIndex + 16] = tri.corners[2][0];
      triangleData[baseIndex + 17] = tri.corners[2][1];
      triangleData[baseIndex + 18] = tri.corners[2][2];
      triangleData[baseIndex + 19] = 0.0; // Padding

      triangleData[baseIndex + 20] = tri.normals[2][0];
      triangleData[baseIndex + 21] = tri.normals[2][1];
      triangleData[baseIndex + 22] = tri.normals[2][2];
      triangleData[baseIndex + 23] = 0.0; // Padding
    }

    this.device.queue.writeBuffer(
      this.triangleBuffer,
      0,
      triangleData.buffer,
      triangleData.byteOffset,
      triangleData.byteLength
    );
  }

  private createMaterialBuffer() {
    const materialSize = 80; // Each Material is 80 bytes (20 floats * 4 bytes)
    const bufferSize = materialSize * this.scene.materials.length;
    this.materialBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private updateMaterialData() {
    const materialDataSize = 20; // 20 floats per material
    const materialData = new Float32Array(materialDataSize * this.scene.materials.length);

    for (let i = 0; i < this.scene.materials.length; i++) {
      const material = this.scene.materials[i];
      const baseIndex = materialDataSize * i;

      // Pack material properties into the array
      materialData[baseIndex + 0] = material.albedo[0];
      materialData[baseIndex + 1] = material.albedo[1];
      materialData[baseIndex + 2] = material.albedo[2];
      materialData[baseIndex + 3] = material.specularChance;

      materialData[baseIndex + 4] = material.specularColor[0];
      materialData[baseIndex + 5] = material.specularColor[1];
      materialData[baseIndex + 6] = material.specularColor[2];
      materialData[baseIndex + 7] = material.specularRoughness;

      materialData[baseIndex + 8] = material.emissionColor[0];
      materialData[baseIndex + 9] = material.emissionColor[1];
      materialData[baseIndex + 10] = material.emissionColor[2];
      materialData[baseIndex + 11] = material.emissionStrength;

      materialData[baseIndex + 12] = material.refractionColor[0];
      materialData[baseIndex + 13] = material.refractionColor[1];
      materialData[baseIndex + 14] = material.refractionColor[2];
      materialData[baseIndex + 15] = material.refractionChance;

      materialData[baseIndex + 16] = material.refractionRoughness;
      materialData[baseIndex + 17] = material.ior;
      materialData[baseIndex + 18] = 0.0; // Padding
      materialData[baseIndex + 19] = 0.0; // Padding
    }

    this.device.queue.writeBuffer(
      this.materialBuffer,
      0,
      materialData.buffer,
      materialData.byteOffset,
      materialData.byteLength
    );
  }

  private createTriangleIndexBuffer() {
    // Calculate total number of triangle indices
    let totalIndices = 0;
    for (const blas of this.scene.blasArray) {
      totalIndices += blas.m_triangleIndices.length;
    }

    // Initialize the global triangle index array
    this.allTriangleIndices = new Uint32Array(totalIndices);

    // Copy and adjust indices
    let indexOffset = 0;
    for (const blas of this.scene.blasArray) {
      // Map BLAS to its starting index in the global triangle index array
      this.blasTriangleIndexOffsets.set(blas, indexOffset);

      const triangleOffset = this.blasTriangleOffsets.get(blas)!;

      for (let i = 0; i < blas.m_triangleIndices.length; i++) {
        // Adjust triangle indices to point to the global triangle array
        this.allTriangleIndices[indexOffset + i] = blas.m_triangleIndices[i] + triangleOffset;
      }

      indexOffset += blas.m_triangleIndices.length;
    }

    // Create the triangle index buffer
    const bufferSize = 4 * this.allTriangleIndices.length;
    this.triangleIndexBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      this.triangleIndexBuffer,
      0,
      this.allTriangleIndices.buffer,
      this.allTriangleIndices.byteOffset,
      this.allTriangleIndices.byteLength
    );
  }

  private createBlasNodeBuffer() {
    let nodeOffset = 0;

    for (const blas of this.scene.blasArray) {
      const triangleIndexOffset = this.blasTriangleIndexOffsets.get(blas)!;
      // Adjust node indices
      for (const node of blas.m_nodes) {
        if (node.triangleCount > 0) {
          // Adjust leftFirst to point to the correct index in the global triangle index array
          node.leftFirst += triangleIndexOffset;
        } else {
          // Adjust child node indices to global node indices
          node.leftFirst += nodeOffset;
        }
        this.allBlasNodes.push(node);
      }

      nodeOffset += blas.m_nodes.length;
    }

    // Create the BLAS node buffer as before
    const nodeSize = 32; // Each BLASNode is 32 bytes
    const bufferSize = nodeSize * this.allBlasNodes.length;

    this.nodeBufferBlas = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createTlasNodeBuffer() {
    // Get TLAS nodes from the scene
    this.tlasNodes = this.scene.tlas.m_tlasNodes;

    // Calculate buffer size
    const nodeSize = 48; // Each TLASNode is 48 bytes
    const bufferSize = nodeSize * this.tlasNodes.length;

    // Create the buffer
    this.nodeBufferTlas = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private createBlasInstanceBuffer() {
    // Get BLAS instances from the scene
    this.blasInstances = this.scene.blasInstanceArray;

    // Calculate buffer size
    const instanceSize = 144; // Each BLASInstance is 144 bytes
    const bufferSize = instanceSize * this.blasInstances.length;

    // Create the buffer
    this.blasInstanceBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private updateBlasNodeData() {
    const floatData = new Float32Array(8 * this.allBlasNodes.length);
    const uintData = new Uint32Array(floatData.buffer);

    for (let i = 0; i < this.allBlasNodes.length; i++) {
      const node = this.allBlasNodes[i];
      const baseIndex = 8 * i;

      // aabbMin
      floatData[baseIndex + 0] = node.aabb.bmin[0];
      floatData[baseIndex + 1] = node.aabb.bmin[1];
      floatData[baseIndex + 2] = node.aabb.bmin[2];

      // leftFirst (as u32)
      uintData[baseIndex + 3] = node.leftFirst;

      // aabbMax
      floatData[baseIndex + 4] = node.aabb.bmax[0];
      floatData[baseIndex + 5] = node.aabb.bmax[1];
      floatData[baseIndex + 6] = node.aabb.bmax[2];

      // triangleCount (as u32)
      uintData[baseIndex + 7] = node.triangleCount;
    }

    // Write the data to the buffer
    this.device.queue.writeBuffer(
      this.nodeBufferBlas,
      0,
      floatData.buffer,
      floatData.byteOffset,
      floatData.byteLength
    );
  }

  private updateTlasNodeData() {
    const floatData = new Float32Array(12 * this.tlasNodes.length);
    const uintData = new Uint32Array(floatData.buffer);

    for (let i = 0; i < this.tlasNodes.length; i++) {
      const node = this.tlasNodes[i];
      const baseIndex = 12 * i;

      // aabbMin
      floatData[baseIndex + 0] = node.aabb.bmin[0];
      floatData[baseIndex + 1] = node.aabb.bmin[1];
      floatData[baseIndex + 2] = node.aabb.bmin[2];

      // left child index
      uintData[baseIndex + 3] = node.left >= 0 ? node.left : 0;

      // aabbMax
      floatData[baseIndex + 4] = node.aabb.bmax[0];
      floatData[baseIndex + 5] = node.aabb.bmax[1];
      floatData[baseIndex + 6] = node.aabb.bmax[2];

      // right child index
      uintData[baseIndex + 7] = node.right >= 0 ? node.right : 0;

      // instance index (blas)
      uintData[baseIndex + 8] = node.blas >= 0 ? node.blas : 0;

      // Padding
      uintData[baseIndex + 9] = 0;
      uintData[baseIndex + 10] = 0;
      uintData[baseIndex + 11] = 0;
    }

    // Write the data to the buffer
    this.device.queue.writeBuffer(
      this.nodeBufferTlas,
      0,
      floatData.buffer,
      floatData.byteOffset,
      floatData.byteLength
    );
  }

  private updateBlasInstanceData() {
    const instanceCount = this.blasInstances.length;
    const floatData = new Float32Array(36 * instanceCount); // 36 floats per instance
    const uintData = new Uint32Array(floatData.buffer);

    for (let i = 0; i < instanceCount; i++) {
      const instance = this.blasInstances[i];
      const baseIndex = 36 * i;

      // Copy transform matrix (16 floats)
      floatData.set(instance.transform, baseIndex);

      // Copy inverse transform matrix (16 floats)
      floatData.set(instance.transformInv, baseIndex + 16);

      // Add blasOffset and materialIdx (as uint32)
      uintData[baseIndex + 32] = instance.blasOffset;
      uintData[baseIndex + 33] = instance.materialIdx;

      // Padding to align to 16 bytes (2 floats)
      floatData[baseIndex + 34] = 0.0;
      floatData[baseIndex + 35] = 0.0;
    }

    // Write the data to the buffer
    this.device.queue.writeBuffer(
      this.blasInstanceBuffer,
      0,
      floatData.buffer,
      floatData.byteOffset,
      floatData.byteLength
    );

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
