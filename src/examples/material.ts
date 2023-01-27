import vertex from "./shaders/vertex.wgsl"
import fragment from "./shaders/fragment.wgsl"

import {
  getModelViewMatrix,
  getLightProjectionMatrix,
  getLightViewMatrix,
  getShadowMatrix,
  CreateStorageBuffer,
  CreateUniformBuffer,
  CreateGPUBuffer,
} from "./helper"
import { mat4, vec3 } from "gl-matrix"

export class Material {
  public vertexShader
  public fragmentShader
  public device: GPUDevice
  public colorBuffer: GPUBuffer
  public modelViewBuffer: GPUBuffer

  //Textures
  public samplerDescriptor: GPUSamplerDescriptor
  public viewDescriptor: GPUTextureViewDescriptor
  public texture: GPUTexture
  public view: GPUTextureView
  public sampler: GPUSampler
  public hasTextureBuffer: GPUBuffer
  public uvBuffer: GPUBuffer
  public uvBufferView: GPUTextureView

  // Light
  public ambientBuffer: GPUBuffer
  public pointBuffer: GPUBuffer
  public directionalBuffer: GPUBuffer
  public shadowDepthView: GPUTextureView
  public lightProjectionBuffer: GPUBuffer
  public shadowDepthTexture: GPUTexture

  constructor(device: GPUDevice) {
    this.device = device
    this.vertexShader = vertex
    this.vertexShader = this.device.createShaderModule({
      code: vertex,
    })
    this.fragmentShader = this.device.createShaderModule({
      code: fragment,
    })
  }

  ///////////////////////////// OBJEKT -> Buffer ///////////////////////////////

  public setObject(NUM: number) {
    // NUM = Object number
    const modelViewMatrix = new Float32Array(NUM * 4 * 4)
    const color = new Float32Array(NUM * 4).fill(0.1)
    for (let i = 0; i < NUM; i++) {
      // Loop for each object
      const position = { x: 1, y: 1, z: 1 }
      const rotation = { x: 1, y: 1, z: 1 }
      const scale = { x: 0.5, y: 0.5, z: 0.5 }
      modelViewMatrix.set(getModelViewMatrix(position, rotation, scale), i * 4 * 4)
    }

    this.colorBuffer = CreateStorageBuffer(this.device, 4 * 4 * NUM)
    this.modelViewBuffer = CreateStorageBuffer(this.device, 4 * 4 * 4 * NUM)
    this.device.queue.writeBuffer(this.colorBuffer, 0, color)
    this.device.queue.writeBuffer(this.modelViewBuffer, 0, modelViewMatrix)

    document.querySelector("#object-brightness")!.addEventListener("input", (e: Event) => {
      const colorValue = +(e.target as HTMLInputElement).value
      color.fill(colorValue)
      this.device.queue.writeBuffer(this.colorBuffer, 0, color)
    })
  }

  /////////////////////////////// TEXTUREN /////////////////////////////////

  async setTexture(textureUrl: string) {
    const res = await fetch(textureUrl)
    const img = await res.blob()
    const options: ImageBitmapOptions = { imageOrientation: "flipY" }
    const imageBitmap = await createImageBitmap(img, options)

    this.texture = this.device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    })

    // create sampler with linear filtering for smooth interpolation
    this.sampler = this.device.createSampler()
    this.device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.texture }, [imageBitmap.width, imageBitmap.height])
  }

  //////////////////////////////// LIGHTING //////////////////////////////////

  public setLight() {
    const ambient = new Float32Array([0.05])
    const pointLight = new Float32Array([0, 0, 10, 0, 0.5, 50, 0, 0]) // 10 z, 0.5 intesity, 50 radius
    const directionalLight = new Float32Array([0, 0, 0, 0, 10, 0, 0, 0]) // 3 intensity

    this.pointBuffer = CreateUniformBuffer(this.device, 8 * 4)
    this.ambientBuffer = CreateUniformBuffer(this.device, 1 * 4)
    this.directionalBuffer = CreateUniformBuffer(this.device, 8 * 4)

    this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight)
    this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)

    this.shadowDepthTexture = this.device.createTexture({
      size: [2048, 2048],
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      format: "depth24plus",
    })
    // create depthTextureView
    this.shadowDepthView = this.shadowDepthTexture.createView()

    this.lightProjectionBuffer = this.device.createBuffer({
      size: 4 * 4 * 4, // 4 x 4 x float32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const lightPosition = vec3.fromValues(0, 100, 0)
    const lightViewMatrix = mat4.create()
    const lightProjectionMatrix = mat4.create()
    const up = vec3.fromValues(0, 1, 0)
    const origin = vec3.fromValues(0, 0, 0)

    // update lights position
    const now = performance.now()
    lightPosition[0] = Math.sin(now / 1500) * 50
    lightPosition[2] = Math.cos(now / 1500) * 50

    // update lvp matrix
    mat4.lookAt(lightViewMatrix, lightPosition, origin, up)
    mat4.ortho(lightProjectionMatrix, -40, 40, -40, 40, -50, 200)
    mat4.multiply(lightProjectionMatrix, lightProjectionMatrix, lightViewMatrix)
    this.device.queue.writeBuffer(this.lightProjectionBuffer, 0, lightProjectionMatrix as Float32Array)

    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    })
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      pointLight[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight)
    })
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      pointLight[1] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight)
    })
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      pointLight[2] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight)
    })
  }
}

/*Shadows
     TODO:
      public shadowMatrixBuffer: GPUBuffer;
      const shadowMatrix = getShadowMatrix(device);
      this.shadowMatrixBuffer = this.device.createBuffer({
       size: 64,
       usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
      this.device.queue.writeBuffer(this.shadowMatrixBuffer, 0, shadowmatrix)
      lightProjectionMatrix.set(lightProjection, i * 4 * 4);
      lightViewMatrix.set(lightView, i * 4 * 4);
      shadowMatrix.set(shadow, i * 4 * 4);
      mat4.multiply(shadowMatrix, lightProjectionMatrix, lightViewMatrix); 
      const lightView = getLightViewMatrix(lightPosition);
      const lightProjection = getLightProjectionMatrix(1, 100);
      const shadow = getShadowMatrix(lightViewMatrix, lightProjectionMatrix, modelViewMatrix); 
      const shadowMatrix = new Float32Array(NUM * 4 * 4);
      const lightProjectionMatrix = new Float32Array(NUM * 4 * 4);
      const lightViewMatrix = new Float32Array(NUM * 4 * 4);
      const lightPosition = { x: 5, y: 5, z: 5 }; 
    */
// usw.
