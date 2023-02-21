import { CreateUniformBuffer } from "./helper"

export class Light {
  ambientBuffer: GPUBuffer
  directionalBuffer: GPUBuffer
  eyePositionBuffer: GPUBuffer
  diffuseIntensityBuffer: GPUBuffer
  specularIntensityBuffer: GPUBuffer
  bindGroup: GPUBindGroup

  async initialize(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout) {
    const ambient = new Float32Array([0.05])
    const directionalLight = new Float32Array([0.5, 0.5, 0.5, 0])
    const eyePosition = new Float32Array([0, 0, 10])
    const diffuseIntensity = new Float32Array([0.5])
    const specularIntensity = new Float32Array([0.5])

    this.ambientBuffer = CreateUniformBuffer(device, 4)
    this.directionalBuffer = CreateUniformBuffer(device, 16)
    this.eyePositionBuffer = CreateUniformBuffer(device, 12)
    this.diffuseIntensityBuffer = CreateUniformBuffer(device, 4)
    this.specularIntensityBuffer = CreateUniformBuffer(device, 4)

    device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    device.queue.writeBuffer(this.eyePositionBuffer, 0, eyePosition)
    device.queue.writeBuffer(this.diffuseIntensityBuffer, 0, diffuseIntensity)
    device.queue.writeBuffer(this.specularIntensityBuffer, 0, specularIntensity)

    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.directionalBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.eyePositionBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.ambientBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.diffuseIntensityBuffer,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: this.specularIntensityBuffer,
          },
        },
      ],
    })

    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    })
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      directionalLight[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      directionalLight[1] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      directionalLight[2] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight)
    })
    document.querySelector("#diffuse")!.addEventListener("input", (e: Event) => {
      diffuseIntensity[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.diffuseIntensityBuffer, 0, diffuseIntensity)
    })
    document.querySelector("#specular")!.addEventListener("input", (e: Event) => {
      specularIntensity[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(this.specularIntensityBuffer, 0, specularIntensity)
    })
  }
}
