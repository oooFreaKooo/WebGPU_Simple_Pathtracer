import raytracer_kernel from '../shaders/raytracer_kernel.wgsl'
import bvh_traverse from '../shaders/bvh_traverse.wgsl'
import screen_shader from '../shaders/screen_shader.wgsl'
import { Scene } from './scene'
import { Deg2Rad, addEventListeners } from '../utils/helper'
import { CubeMapMaterial } from '../components/material'
import { computePass, createAndUpdateBlasInstanceBuffer, createAndUpdateBlasNodeBuffer, createAndUpdateMaterialBuffer, createAndUpdateTlasNodeBuffer, createAndUpdateTriangleBuffer, createBindGroups, createBuffer, createBufferWithData, createComputePipeline, createRenderPassDescriptor, createRenderPipeline, createVertexBuffer, renderPass, updateBuffer } from '../utils/webgpu'
import { Triangle } from '../components/triangle'
import { BLASNode } from '../bvh/blas'
import { TLASNode } from '../bvh/tlas'
import { BLASInstance } from '../bvh/blas-instance'

const frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById('frame-time')
const renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById('render-time')

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

    private nodeBufferBlas: GPUBuffer
    private allBlasNodes: BLASNode[] = []
    private nodeBufferTlas: GPUBuffer
    private tlasNodes: TLASNode[]
    private blasInstanceBuffer: GPUBuffer
    private blasInstances: BLASInstance[]

    private triangleBuffer: GPUBuffer
    private allTriangles: Triangle[] = []
    private triangleIndexBuffer: GPUBuffer
    private allTriangleIndices: Uint32Array

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

    private floatDataBlas: Float32Array
    private uintDataBlas: Uint32Array
    private floatDataTlas: Float32Array
    private uintDataTlas: Uint32Array

    private frametime: number = 0
    private loaded = false
    private updatedUniformArray: Float32Array

    private renderOutputBindGroup: GPUBindGroup
    private uniformBindGroup: GPUBindGroup
    private frameBufferBindGroup: GPUBindGroup
    private objectBindGroup: GPUBindGroup
    private textureBindGroup: GPUBindGroup
    private frameNum = 0

    constructor (canvas: HTMLCanvasElement, scene: Scene) {
        this.canvas = canvas
        this.scene = scene
    }

    async Initialize () {
        await this.setupDevice()
        await this.createAssets()
        await this.makeComputePipeline()
        await this.makeRenderPipeline()
        await this.renderLoop()
    }

    async setupDevice () {
        // adapter: wrapper around (physical) GPU.
        // Describes features and limits
        this.adapter = <GPUAdapter>await navigator.gpu?.requestAdapter({
            powerPreference: 'high-performance',
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
        this.context = <GPUCanvasContext>this.canvas.getContext('webgpu')
        this.format = 'rgba16float'
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'opaque',
        })
    }

    async createAssets () {
        this.createUniformBuffer()
        this.createImgOutputBuffer()
        this.createFrameBuffer()
        this.createCameraBuffer()
        this.createAndUpdateMaterialBuffer()
        this.createAndUpdateTriangleBuffer()
        this.createAndUpdateBlasNodeBuffer()
        this.createAndUpdateTlasNodeBuffer()
        this.createAndUpdateBlasInstanceBuffer()
        this.createSettingsBuffer()
        this.createTriangleIndexBuffer()
        const vertexData = new Float32Array([ -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1 ])
        this.vertexBuffer = createVertexBuffer(this.device, vertexData)
        await this.createSkyTexture()
    }

    async makeComputePipeline () {
        // Create compute pipeline
        this.ray_tracing_pipeline = createComputePipeline(
            this.device,
            raytracer_kernel + bvh_traverse,
            'main',
        )
      
        // Prepare bind group entries
        const uniformBindGroupEntries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: { buffer: this.cameraBuffer } },
            { binding: 2, resource: { buffer: this.settingsBuffer } },
            { binding: 3, resource: { buffer: this.camsettingsBuffer } },
        ]
      
        const frameBufferBindGroupEntries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: this.frameBuffer } },
        ]
      
        const objectBindGroupEntries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: this.triangleBuffer } },
            { binding: 1, resource: { buffer: this.nodeBufferBlas } },
            { binding: 2, resource: { buffer: this.blasInstanceBuffer } },
            { binding: 3, resource: { buffer: this.nodeBufferTlas } },
            { binding: 4, resource: { buffer: this.triangleIndexBuffer } },
            { binding: 5, resource: { buffer: this.materialBuffer } },
        ]
      
        const textureBindGroupEntries: GPUBindGroupEntry[] = [
            { binding: 0, resource: this.sky_texture.view },
            { binding: 1, resource: this.sky_texture.sampler },
        ]
      
        // Create bind groups
        const bindGroups = createBindGroups(
            this.device,
            this.ray_tracing_pipeline,
            [
                uniformBindGroupEntries,
                frameBufferBindGroupEntries,
                objectBindGroupEntries,
                textureBindGroupEntries,
            ],
        );
      
        // Assign bind groups to properties
        [
            this.uniformBindGroup,
            this.frameBufferBindGroup,
            this.objectBindGroup,
            this.textureBindGroup,
        ] = bindGroups
    }
      
    async makeRenderPipeline () {
        const vertexBuffers: GPUVertexBufferLayout[] = [
            {
                arrayStride: 2 * 4, // 2 floats, 4 bytes each
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x2' },
                ],
            },
        ]
      
        this.render_output_pipeline = createRenderPipeline(
            this.device,
            screen_shader, // `screen_shader` contains both vertex and fragment code
            screen_shader,
            'vert_main',
            'frag_main',
            vertexBuffers,
            this.format,
        )
      
        const renderOutputBindGroupEntries: GPUBindGroupEntry[] = [
            { binding: 0, resource: { buffer: this.uniformBuffer } },
            { binding: 1, resource: { buffer: this.frameBuffer } },
            { binding: 2, resource: { buffer: this.imgOutputBuffer } },
        ]
      
        this.renderOutputBindGroup = createBindGroups(
            this.device,
            this.render_output_pipeline,
            [ renderOutputBindGroupEntries ],
        )[0]
      
        this.renderPassDescriptor = createRenderPassDescriptor()
    }

    private updateScene () {
        if (this.scene.camera.cameraIsMoving) {
            this.updateCamera()
        }

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

        addEventListeners(this)
        this.updateSettings()
        this.updateCamSettings()
        this.updateImgSettings()

        // Update the triangle count label
        const uploadTimeLabel = document.getElementById('triangles') as HTMLElement
        uploadTimeLabel.innerText = this.allTriangles.length.toString()

    }

    async createSkyTexture () {
        const textureID = 4 // 0 = space, 2 = mars, 3 = town, 4 = garden
        const urls = [
            './src/assets/textures/skybox/right.png',
            './src/assets/textures/skybox/left.png',
            './src/assets/textures/skybox/top.png',
            './src/assets/textures/skybox/bottom.png',
            './src/assets/textures/skybox/front.png',
            './src/assets/textures/skybox/back.png',
        ]

        // modifies the urls with the ID
        const modifiedUrls = urls.map((url) => {
            const parts = url.split('.')
            const newUrl = `${parts[0]}${parts[1]}${textureID}.${parts[2]}`
            return newUrl
        })

        this.sky_texture = new CubeMapMaterial()
        await this.sky_texture.initialize(this.device, modifiedUrls)
    }

    private createUniformBuffer () {
        // Set initial uniform values
        this.uniforms = {
            screenDims: [ this.canvas.width, this.canvas.height ],
            frameNum: 0,
            resetBuffer: 0,
        }
      
        // Create a Float32Array to hold the uniform data
        const uniformArray = new Float32Array([
            this.uniforms.screenDims[0],
            this.uniforms.screenDims[1],
            this.uniforms.frameNum,
            this.uniforms.resetBuffer,
        ])
      
        this.uniformBuffer = createBufferWithData(
            this.device,
            'Uniform Buffer',
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            uniformArray,
        )
    }

    private createImgOutputBuffer () {
        this.imgOutputBuffer = createBuffer(
            this.device,
            'Image Output Buffer',
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            12, // 3 floats * 4 bytes
        )
    }

    updateImgSettings () {
        const camSettings = new Float32Array([
            this.scene.enableGammaCorrection ? 1.0 : 0.0,
            this.scene.enableACES ? 1.0 : 0.0,
            this.scene.enableFilmic ? 1.0 : 0.0,
        ])
      
        updateBuffer(this.device, this.imgOutputBuffer, camSettings)
    }

    private createFrameBuffer () {
        const frameNum = new Float32Array(this.canvas.width * this.canvas.height * 4)
        frameNum.fill(0)
      
        this.frameBuffer = createBufferWithData(
            this.device,
            'Framebuffer',
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            frameNum,
        )
    }

    private createAndUpdateMaterialBuffer () {
        this.materialBuffer = createAndUpdateMaterialBuffer(
            this.device,
            this.scene.materials,
        )
    }

    private createAndUpdateTriangleBuffer () {
        // Flatten all triangles from BLASes
        this.allTriangles = []
        let triangleOffset = 0
        for (const blas of this.scene.blasArray) {
            this.scene.blasTriangleOffsetMap.set(blas.id, triangleOffset)
            this.allTriangles.push(...blas.m_triangles)
            triangleOffset += blas.m_triangles.length
        }
      
        this.triangleBuffer = createAndUpdateTriangleBuffer(
            this.device,
            this.allTriangles,
        )
    }
    

    private createTriangleIndexBuffer () {
        let totalIndices = 0
        for (const blas of this.scene.blasArray) {
            totalIndices += blas.m_triangleIndices.length
        }
      
        this.allTriangleIndices = new Uint32Array(totalIndices)
      
        let indexOffset = 0
        for (const blas of this.scene.blasArray) {
            const triangleOffset = this.scene.blasTriangleOffsetMap.get(blas.id)!
            for (let i = 0; i < blas.m_triangleIndices.length; i++) {
                this.allTriangleIndices[indexOffset + i] =
              blas.m_triangleIndices[i] + triangleOffset
            }
            indexOffset += blas.m_triangleIndices.length
        }
      
        this.triangleIndexBuffer = createBufferWithData(
            this.device,
            'Triangle Index Buffer',
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            this.allTriangleIndices,
        )
    }
    
    private createAndUpdateBlasNodeBuffer () {
        let nodeOffset = 0
        this.allBlasNodes = []
      
        for (const blas of this.scene.blasArray) {
            const triangleIndexOffset = this.scene.blasTriangleOffsetMap.get(blas.id)
            const baseNodeOffset = nodeOffset
            for (const node of blas.m_nodes) {
                if (node.triangleCount > 0) {
                    node.leftFirst += triangleIndexOffset!
                } else {
                    node.leftFirst += baseNodeOffset
                }
                this.allBlasNodes.push(node)
                nodeOffset += 1
            }
        }
      
        this.nodeBufferBlas = createAndUpdateBlasNodeBuffer(
            this.device,
            this.allBlasNodes,
        )
    }

    private createAndUpdateTlasNodeBuffer () {
        this.tlasNodes = this.scene.tlas.m_tlasNodes
      
        this.nodeBufferTlas = createAndUpdateTlasNodeBuffer(
            this.device,
            this.tlasNodes,
        )
    }

    private createAndUpdateBlasInstanceBuffer () {
        // Get BLAS instances from the scene
        this.blasInstances = this.scene.blasInstanceArray
      
        this.blasInstanceBuffer = createAndUpdateBlasInstanceBuffer(
            this.device,
            this.blasInstances,
        )
    }

    private createCameraBuffer () {
        const descriptor: GPUBufferDescriptor = {
            size: 18 * 6,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }
        this.cameraBuffer = this.device.createBuffer(descriptor)
    }

    private updateCamera () {
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
    private createSettingsBuffer () {
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

    updateCamSettings () {
        const camSettings = {
            fov: Deg2Rad(this.scene.camera.fov),
        }

        this.device.queue.writeBuffer(
            this.camsettingsBuffer,
            0,
            new Float32Array([ camSettings.fov ]),
            0,
            1,
        )
    }

    updateSettings () {
        this.updateImgSettings()
      
        const settingsData = {
            maxBounces: this.scene.maxBounces,
            samples: this.scene.samples,
            culling: this.scene.enableCulling,
            skyMode: this.scene.skyMode,
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
                settingsData.skyMode,
                settingsData.aspectRatio,
                settingsData.jitterScale,
            ]),
            0,
            6
        )
    }
      

    totalFrametime = 0
    totalFrames = 0
    requestId: number | null = null

    async renderLoop () {
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
        const workGroupsX = Math.ceil(this.canvas.width / 8)
        const workGroupsY = Math.ceil(this.canvas.height / 8)
        

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
