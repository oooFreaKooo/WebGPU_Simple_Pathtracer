import { vec3 } from 'gl-matrix'

interface MaterialOptions {
  albedo?: vec3 // the color used for diffuse lighting
  specularColor?: vec3 // the color tint of specular reflections
  emissionColor?: vec3 // how much the surface glows
  emissionStrength?: number
  roughness?: number // how rough the surface is
  specularChance?: number // percentage chance of doing a specular reflection
  ior?: number // index of refraction. used by fresnel and refraction.
  refractionChance?: number // percent chance of doing a refractive transmission
  refractionColor?: vec3 // absorption for beer's law
  sssColor?: vec3 // color of the subsurface scattering
  sssStrength?: number // intensity of the scattering
  sssRadius?: number  // radius for scattering effect
}

export class Material {
    albedo: vec3
    specularColor: vec3
    emissionColor: vec3
    emissionStrength: number
    roughness: number
    specularChance: number
    ior: number
    refractionChance: number
    refractionColor: vec3
    sssColor: vec3
    sssStrength: number
    sssRadius: number

    constructor (options: MaterialOptions = {}) {
        const defaults: MaterialOptions = {
            albedo: [ 0.8, 0.8, 0.8 ],
            specularColor: [ 1.0, 1.0, 1.0 ],
            emissionColor: [ 0.0, 0.0, 0.0 ],
            emissionStrength: 0.0,
            roughness: 1.0,
            specularChance: 0.01,
            ior: 1.0,
            refractionChance: 0.0,
            refractionColor: [ 0.0, 0.0, 0.0 ],
            sssColor: [ 1.0, 1.0, 1.0 ], // default white scattering
            sssStrength: 0.0, // default no scattering
            sssRadius: 1.0, // uniform scattering radius
        }

        const finalOptions = { ...defaults, ...options }

        this.albedo = finalOptions.albedo!
        this.specularColor = finalOptions.specularColor!
        this.emissionColor = finalOptions.emissionColor!
        this.emissionStrength = finalOptions.emissionStrength!
        this.roughness = finalOptions.roughness!
        this.specularChance = finalOptions.specularChance!
        this.ior = finalOptions.ior!
        this.refractionChance = finalOptions.refractionChance!
        this.refractionColor = finalOptions.refractionColor!
        this.sssColor = finalOptions.sssColor!
        this.sssStrength = finalOptions.sssStrength!
        this.sssRadius = finalOptions.sssRadius!
    }
}


export class CubeMapMaterial {
    private texture: GPUTexture
    sampler: GPUSampler
    view: GPUTextureView
    async initialize (device: GPUDevice, urls: string[]) {
        const imageData: ImageBitmap[] = new Array(6)

        for (let i: number = 0; i < 6; i++) {
            const response: Response = await fetch(urls[i])
            const blob: Blob = await response.blob()
            imageData[i] = await createImageBitmap(blob)
        }
        await this.loadImageBitmaps(device, imageData)

        const viewDescriptor: GPUTextureViewDescriptor = {
            format: 'rgba8unorm',
            dimension: 'cube',
            aspect: 'all',
            baseMipLevel: 0,
            mipLevelCount: 1,
            baseArrayLayer: 0,
            arrayLayerCount: 6,
        }
        this.view = this.texture.createView(viewDescriptor)

        const samplerDescriptor: GPUSamplerDescriptor = {
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'nearest',
            mipmapFilter: 'nearest',
            maxAnisotropy: 1,
        }
        this.sampler = device.createSampler(samplerDescriptor)
    }

    async loadImageBitmaps (device: GPUDevice, imageData: ImageBitmap[]) {
        const textureDescriptor: GPUTextureDescriptor = {
            dimension: '2d',
            size: {
                width: imageData[0].width,
                height: imageData[0].height,
                depthOrArrayLayers: 6,
            },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        }

        this.texture = device.createTexture(textureDescriptor)

        for (let i = 0; i < 6; i++) {
            device.queue.copyExternalImageToTexture({ source: imageData[i] }, { texture: this.texture, origin: [ 0, 0, i ] }, [
                imageData[i].width,
                imageData[i].height,
            ])
        }
    }
}
