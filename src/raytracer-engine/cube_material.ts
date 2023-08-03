export class CubeMapMaterial {
  texture: GPUTexture
  view: GPUTextureView
  sampler: GPUSampler

  async initialize(device: GPUDevice, url: string) {
    const response: Response = await fetch(url)
    const blob: Blob = await response.blob()
    const imageData: ImageBitmap = await createImageBitmap(blob)

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
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 1,
    }
    this.sampler = device.createSampler(samplerDescriptor)
  }

  async loadImageBitmaps(device: GPUDevice, imageData: ImageBitmap) {
    const width = imageData.width / 4
    const height = imageData.height / 3

    const textureDescriptor: GPUTextureDescriptor = {
      dimension: "2d",
      size: {
        width,
        height,
        depthOrArrayLayers: 6,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }

    this.texture = device.createTexture(textureDescriptor)

    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d")

    const faceCoords = [
      [2, 1], // Positive X (Right)
      [0, 1], // Negative X (Left)
      [1, 0], // Positive Y (Top)
      [1, 2], // Negative Y (Bottom)
      [1, 1], // Positive Z (Front)
      [3, 1], // Negative Z (Back)
    ]

    for (let i = 0; i < 6; i++) {
      const [sourceX, sourceY] = faceCoords[i]

      context?.drawImage(imageData, sourceX * width, sourceY * height, width, height, 0, 0, width, height)

      const imageBitmap = await createImageBitmap(canvas)

      device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.texture, origin: [0, 0, i] }, [width, height])
    }
  }
}
