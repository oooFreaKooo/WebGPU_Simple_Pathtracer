import { vec3 } from "gl-matrix"

interface MaterialOptions {
  albedo?: vec3 // the color used for diffuse lighting
  specularColor?: vec3 // the color tint of specular reflections
  emissionColor?: vec3 // how much the surface glows
  emissionStrength?: number
  specularRoughness?: number // how rough the specular reflections are
  specularChance?: number // percentage chance of doing a specular reflection
  ior?: number // index of refraction. used by fresnel and refraction.
  refractionChance?: number // percent chance of doing a refractive transmission
  refractionRoughness?: number // how rough the refractive transmissions are
  refractionColor?: vec3 // absorption for beer's law
}

export class Material {
  albedo: vec3
  emissionColor: vec3
  emissionStrength: number
  ior: number
  refractionChance: number
  refractionColor: vec3
  refractionRoughness: number
  specularChance: number
  specularColor: vec3
  specularRoughness: number
  constructor(options: MaterialOptions = {}) {
    const defaults: MaterialOptions = {
      albedo: [0.8, 0.8, 0.8],
      specularColor: [1.0, 1.0, 1.0],
      emissionColor: [0.0, 0.0, 0.0],
      emissionStrength: 0.0,
      specularRoughness: 1.0,
      specularChance: 0.1,
      ior: 1.0,
      refractionChance: 0.0,
      refractionRoughness: 0.0,
      refractionColor: [0.0, 0.0, 0.0],
    }

    const finalOptions = { ...defaults, ...options }

    this.albedo = finalOptions.albedo!
    this.specularColor = finalOptions.specularColor!
    this.emissionColor = finalOptions.emissionColor!
    this.emissionStrength = finalOptions.emissionStrength!
    this.specularRoughness = finalOptions.specularRoughness!
    this.specularChance = finalOptions.specularChance!
    this.ior = finalOptions.ior!
    this.refractionChance = finalOptions.refractionChance!
    this.refractionRoughness = finalOptions.refractionRoughness!
    this.refractionColor = finalOptions.refractionColor!
  }
}

export class CubeMapMaterial {
  private texture: GPUTexture
  sampler: GPUSampler
  view: GPUTextureView
  async initialize(device: GPUDevice, urls: string[]) {
    var imageData: ImageBitmap[] = new Array(6)

    for (var i: number = 0; i < 6; i++) {
      const response: Response = await fetch(urls[i])
      const blob: Blob = await response.blob()
      imageData[i] = await createImageBitmap(blob)
    }
    await this.loadImageBitmaps(device, imageData)

    const viewDescriptor: GPUTextureViewDescriptor = {
      format: "rgba8unorm",
      dimension: "cube",
      aspect: "all",
      baseMipLevel: 0,
      mipLevelCount: 1,
      baseArrayLayer: 0,
      arrayLayerCount: 6,
    }
    this.view = this.texture.createView(viewDescriptor)

    const samplerDescriptor: GPUSamplerDescriptor = {
      addressModeU: "repeat",
      addressModeV: "repeat",
      magFilter: "linear",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      maxAnisotropy: 1,
    }
    this.sampler = device.createSampler(samplerDescriptor)
  }

  async loadImageBitmaps(device: GPUDevice, imageData: ImageBitmap[]) {
    const textureDescriptor: GPUTextureDescriptor = {
      dimension: "2d",
      size: {
        width: imageData[0].width,
        height: imageData[0].height,
        depthOrArrayLayers: 6,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    this.texture = device.createTexture(textureDescriptor)

    for (var i = 0; i < 6; i++) {
      device.queue.copyExternalImageToTexture({ source: imageData[i] }, { texture: this.texture, origin: [0, 0, i] }, [
        imageData[i].width,
        imageData[i].height,
      ])
    }
  }
}
