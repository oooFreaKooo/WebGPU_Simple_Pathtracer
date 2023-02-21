export class Material {
  texture: GPUTexture
  sampler: GPUSampler
  bindGroup: GPUBindGroup

  async initialize(device: GPUDevice, url: string, bindGroupLayout: GPUBindGroupLayout) {
    const res = await fetch(url)
    const img = await res.blob()
    const options: ImageBitmapOptions = { imageOrientation: "flipY" }
    const imageBitmap = await createImageBitmap(img, options)

    await this.loadImageBitmap(device, imageBitmap)

    this.texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    })

    // create sampler with linear filtering for smooth interpolation
    this.sampler = device.createSampler()
    device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.texture }, [imageBitmap.width, imageBitmap.height])

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: this.texture.createView(),
        },
        {
          binding: 1,
          resource: this.sampler,
        },
      ],
    })
  }

  async loadImageBitmap(device: GPUDevice, imageData: ImageBitmap) {
    const textureDescriptor: GPUTextureDescriptor = {
      size: {
        width: imageData.width,
        height: imageData.height,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    this.texture = device.createTexture(textureDescriptor)

    device.queue.copyExternalImageToTexture({ source: imageData }, { texture: this.texture }, textureDescriptor.size)
  }
}

export const CreateMaterialGroupLayout = (device: GPUDevice) => {
  const materialGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
    ],
  })
  return materialGroupLayout
}
