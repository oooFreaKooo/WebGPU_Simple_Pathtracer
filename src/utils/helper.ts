import { vec3 } from "gl-matrix"
import { Renderer } from "../raytracer-engine/renderer"
import { Material } from "../raytracer-engine/material"

export interface ObjectProperties {
  modelPath: string
  material: Material
  position?: vec3
  scale?: vec3
  rotation?: vec3
  objectID?: number
}

export function CreatePipeline(device: GPUDevice, vertexShader: string, fragmentShader: string, stride: number): GPURenderPipeline {
  let pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: vertexShader,
      }),
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: stride, // ( 3 (pos) + 3 (norm) + 2 (uv) ) * 4 bytes
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
              format: "float32x3",
            },
            {
              // uv
              shaderLocation: 1,
              offset: 3 * 4,
              format: "float32x2",
            },
            {
              // norm
              shaderLocation: 2,
              offset: (3 + 2) * 4,
              format: "float32x3",
            },
          ],
        } as GPUVertexBufferLayout,
      ],
    },

    fragment: {
      module: device.createShaderModule({
        code: fragmentShader,
      }),
      entryPoint: "fs_main",
      targets: [
        {
          format: "bgra8unorm" as GPUTextureFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },

            alpha: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },

    primitive: {
      topology: "triangle-list",
      cullMode: "none",
    },

    layout: "auto",
    depthStencil: {
      format: "depth24plus-stencil8",
      depthWriteEnabled: true,
      depthCompare: "less-equal",
    },
  })
  return pipeline
}
export const CreateDepthStencil = (device: GPUDevice, canvas: HTMLCanvasElement): GPURenderPassDepthStencilAttachment => {
  const depthStencilAttachment = {
    view: device
      .createTexture({
        size: {
          width: canvas.width,
          height: canvas.height,
          depthOrArrayLayers: 1,
        },
        format: "depth24plus-stencil8",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      .createView({
        format: "depth24plus-stencil8",
        dimension: "2d",
        aspect: "all",
      }),
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",

    stencilLoadOp: "clear",
    stencilStoreOp: "discard",
  }
  return depthStencilAttachment as GPURenderPassDepthStencilAttachment
}

export async function setTexture(textureUrl: string) {
  const res = await fetch(textureUrl)
  const img = await res.blob()
  const options: ImageBitmapOptions = { imageOrientation: "flipY" }
  const imageBitmap = await createImageBitmap(img, options)
  return imageBitmap
}

export const CreateUniformBuffer = (device: GPUDevice, size: number) => {
  const buffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  return buffer
}

export const CreateStorageBuffer = (device: GPUDevice, size: number) => {
  const buffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  })
  return buffer
}

export const CreateGPUBuffer = (
  device: GPUDevice,
  data: Float32Array,
  usageFlag: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
) => {
  const buffer = device.createBuffer({
    size: data.byteLength * 2,
    usage: usageFlag,
    mappedAtCreation: true,
  })
  new Float32Array(buffer.getMappedRange()).set(data)
  buffer.unmap()
  return buffer
}

export function Deg2Rad(theta: number): number {
  return (theta * Math.PI) / 180
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const bigint = parseInt(hex.slice(1), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

export function addEventListeners(instance: Renderer) {
  document.querySelector<HTMLInputElement>("#emissionStrength")!.addEventListener("input", (event) => {
    const value = parseFloat((event.target as HTMLInputElement).value)
    for (let triangle of instance.scene.triangles) {
      triangle.material.emissionStrength = value
    }
    instance.updateTriangleData()
  })
}
export function linearToSRGB(x: number) {
  if (x <= 0.0031308) {
    return 12.92 * x
  }
  return 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055
}
