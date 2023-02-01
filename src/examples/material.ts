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
  public vertexShader: GPUShaderModule
  public fragmentShader: GPUShaderModule
  public device: GPUDevice
  public colorBuffer: GPUBuffer

  //Textures
  public samplerDescriptor: GPUSamplerDescriptor
  public viewDescriptor: GPUTextureViewDescriptor
  public texture: GPUTexture
  public sampler: GPUSampler

  // Light
  public ambientBuffer: GPUBuffer
  public directionalBuffer: GPUBuffer
  public eyePositionBuffer: GPUBuffer
  public diffuseIntensityBuffer: GPUBuffer
  public specularIntensityBuffer: GPUBuffer

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

  /////////////////////////////// TEXTUREN /////////////////////////////////

  async setTexture(textureUrl: string) {
    const res = await fetch(textureUrl)
    const img = await res.blob()
    const options: ImageBitmapOptions = { imageOrientation: "flipY" }
    const imageBitmap = await createImageBitmap(img, options)

    this.texture = this.device.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
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
    const directionalLight = new Float32Array([0.5, 0.5, 0.5, 0])
    const eyePosition = new Float32Array([0, 0, 10])
    const diffuseIntensity = new Float32Array([0.5])
    const specularIntensity = new Float32Array([0.5])

    this.ambientBuffer = CreateUniformBuffer(this.device, 4)
    this.directionalBuffer = CreateUniformBuffer(this.device, 16)
    this.eyePositionBuffer = CreateUniformBuffer(this.device, 12)
    this.diffuseIntensityBuffer = CreateUniformBuffer(this.device, 4)
    this.specularIntensityBuffer = CreateUniformBuffer(this.device, 4)

    this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    this.device.queue.writeBuffer(this.eyePositionBuffer, 0, eyePosition)
    this.device.queue.writeBuffer(this.diffuseIntensityBuffer, 0, diffuseIntensity)
    this.device.queue.writeBuffer(this.specularIntensityBuffer, 0, specularIntensity)

    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    })
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      directionalLight[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      directionalLight[1] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      directionalLight[2] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#diffuse")!.addEventListener("input", (e: Event) => {
      diffuseIntensity[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.diffuseIntensityBuffer, 0, diffuseIntensity)
    })
    document.querySelector("#specular")!.addEventListener("input", (e: Event) => {
      specularIntensity[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.specularIntensityBuffer, 0, specularIntensity)
    })
  }
}
