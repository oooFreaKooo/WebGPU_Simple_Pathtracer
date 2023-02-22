import { Scene } from "../framework/scene"
import { CreateUniformBuffer } from "./helper"

export class Light {
  private readonly device: GPUDevice
  private readonly ambientBuffer: GPUBuffer
  private readonly directionalBuffer: GPUBuffer
  private readonly eyePositionBuffer: GPUBuffer
  private readonly diffuseIntensityBuffer: GPUBuffer
  private readonly specularIntensityBuffer: GPUBuffer
  private readonly directionalLight = new Float32Array([1.0, 1.0, 1.0])

  bindGroup: GPUBindGroup

  constructor(device: GPUDevice) {
    this.device = device

    this.ambientBuffer = CreateUniformBuffer(this.device, 4)
    this.directionalBuffer = CreateUniformBuffer(this.device, 16)
    this.eyePositionBuffer = CreateUniformBuffer(this.device, 12)
    this.diffuseIntensityBuffer = CreateUniformBuffer(this.device, 4)
    this.specularIntensityBuffer = CreateUniformBuffer(this.device, 4)
  }

  async initialize(bindGroupLayout: GPUBindGroupLayout) {
    const ambient = new Float32Array([0.05])
    const eyePosition = new Float32Array([0.5, 0.5, 0.5])
    const diffuseIntensity = new Float32Array([0.5])
    const specularIntensity = new Float32Array([0.5])

    this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    this.device.queue.writeBuffer(this.directionalBuffer, 0, this.directionalLight)
    this.device.queue.writeBuffer(this.eyePositionBuffer, 0, eyePosition)
    this.device.queue.writeBuffer(this.diffuseIntensityBuffer, 0, diffuseIntensity)
    this.device.queue.writeBuffer(this.specularIntensityBuffer, 0, specularIntensity)

    this.bindGroup = this.device.createBindGroup({
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
      this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient)
    })
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      this.directionalLight[0] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, this.directionalLight)
    })
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      this.directionalLight[1] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, this.directionalLight)
    })
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      this.directionalLight[2] = +(e.target as HTMLInputElement).value
      this.device.queue.writeBuffer(this.directionalBuffer, 0, this.directionalLight)
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

export const CreateLightGroupLayout = (device: GPUDevice) => {
  const lightGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
    ],
  })
  return lightGroupLayout
}
