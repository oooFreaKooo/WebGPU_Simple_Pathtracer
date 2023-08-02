import { vec3, vec2, mat4 } from "gl-matrix"
import { Color, CreateGPUBuffer, CreatePipeline, CreateStorageBuffer, CreateUniformBuffer, ObjParameter } from "../utils/helper"
import {
  device,
  cameraUniformBuffer,
  cameraPosBuffer,
  ambientLightBuffer,
  diffuseLightBuffer,
  positionLightBuffer,
  materialDataBuffer,
} from "../core/renderer"
import vertex from "../assets/shaders/vertex.wgsl"
import fragment from "../assets/shaders/fragment.wgsl"
import { Node3d } from "./Node3d"
import { Material } from "../materials/material"

export var objectCount = -1

export class ObjMesh extends Node3d {
  public x: number = 0
  public y: number = 0
  public z: number = 0

  public rotX: number = 0
  public rotY: number = 0
  public rotZ: number = 0

  public scaleX: number = 1
  public scaleY: number = 1
  public scaleZ: number = 1

  private defaultColor: Color = {
    r: 0.5,
    g: 0.5,
    b: 0.5,
    a: 1.0,
  }

  private defaultMaterial = new Material()

  private matrixSize = 4 * 16 // 4x4 matrix
  private offset = 256 // transformationBindGroup offset must be 256-byte aligned
  private uniformBufferSize = this.offset

  private transformMatrix = mat4.create() as Float32Array
  private rotateMatrix = mat4.create() as Float32Array

  private renderPipeline: GPURenderPipeline
  private transformationBuffer: GPUBuffer
  private transformationBindGroup: GPUBindGroup
  private verticesBuffer: GPUBuffer
  private colorBuffer: GPUBuffer
  private vertices: Float32Array
  private perVertex = 3 + 3 + 2 // 3 for position, 3 for normal, 2 for uv
  private stride = this.perVertex * 4 // stride = byte length of vertex data array

  constructor(vertices: Float32Array, public material?: Material, parameter?: ObjParameter, color?: Color) {
    objectCount++
    super(parameter)
    super.rotate(this.rotX, this.rotY, this.rotZ)
    super.translate(this.x, this.y, this.z)
    super.scale(this.scaleX, this.scaleY, this.scaleZ)

    this.vertices = vertices
    this.setTransformation(parameter)
    // PIPELINE
    this.renderPipeline = CreatePipeline(device, vertex, fragment, this.stride)

    this.verticesBuffer = device.createBuffer({
      size: vertices.length * this.stride,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })

    const mapping = new Float32Array(this.verticesBuffer.getMappedRange())
    for (let i = 0; i < this.vertices.length; i += this.perVertex) {
      // Multiply the positions by the scale factors
      mapping[i] = this.vertices[i] * this.scaleX
      mapping[i + 1] = this.vertices[i + 1] * this.scaleY
      mapping[i + 2] = this.vertices[i + 2] * this.scaleZ
      // Copy the UV data
      mapping[i + 3] = this.vertices[i + 3]
      mapping[i + 4] = this.vertices[i + 4]
      // Copy the remaining vertex data
      for (let j = 5; j < this.perVertex; j++) {
        mapping[i + j] = this.vertices[i + j]
      }
    }
    this.verticesBuffer.unmap()

    this.transformationBuffer = CreateUniformBuffer(device, this.uniformBufferSize)
    this.colorBuffer = CreateStorageBuffer(device, Float32Array.BYTES_PER_ELEMENT * 4)

    const colorMapping = new Float32Array(this.colorBuffer.getMappedRange())
    colorMapping.set(
      color ? [color.r, color.g, color.b, color.a] : [this.defaultColor.r, this.defaultColor.g, this.defaultColor.b, this.defaultColor.a],
      0,
    )
    this.colorBuffer.unmap()

    // MATERIAL BUFFER

    const ambient = material ? material.getAmbient() : this.defaultMaterial.getAmbient()
    const diffuse = material ? material.getDiffuse() : this.defaultMaterial.getDiffuse()
    const specular = material ? material.getSpecular() : this.defaultMaterial.getSpecular()
    const shininess = material ? material.getShininess() : this.defaultMaterial.getShininess()
    device.queue.writeBuffer(materialDataBuffer, 0 + objectCount * 16, ambient.buffer)
    device.queue.writeBuffer(materialDataBuffer, 4 + objectCount * 16, diffuse.buffer)
    device.queue.writeBuffer(materialDataBuffer, 8 + objectCount * 16, specular.buffer)
    device.queue.writeBuffer(materialDataBuffer, 12 + objectCount * 16, shininess.buffer)

    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(materialDataBuffer, 0, ambient.buffer)
    })
    document.querySelector("#diffuse")!.addEventListener("input", (e: Event) => {
      diffuse[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(materialDataBuffer, 4, diffuse.buffer)
    })
    document.querySelector("#specular")!.addEventListener("input", (e: Event) => {
      specular[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(materialDataBuffer, 8, specular.buffer)
    })
    document.querySelector("#shininess")!.addEventListener("input", (e: Event) => {
      shininess[0] = +(e.target as HTMLInputElement).value
      device.queue.writeBuffer(materialDataBuffer, 12, shininess.buffer)
    })

    const diffuseBitmap = material ? material.getDiffuseTexture() : this.defaultMaterial.getDiffuseTexture()
    let diffuseTexture = device.createTexture({
      size: [diffuseBitmap.width, diffuseBitmap.height],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const diffuseSampler = device.createSampler()
    device.queue.copyExternalImageToTexture({ source: diffuseBitmap }, { texture: diffuseTexture }, [diffuseBitmap.width, diffuseBitmap.height])

    const entries = [
      {
        binding: 0,
        resource: {
          buffer: this.transformationBuffer,
          offset: 0,
          size: this.matrixSize * 2,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: this.colorBuffer,
          offset: 0,
          size: Float32Array.BYTES_PER_ELEMENT * 4,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: cameraUniformBuffer,
          offset: 0,
          size: this.matrixSize,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: cameraPosBuffer,
          offset: 0,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: materialDataBuffer,
          offset: 0,
        },
      },
      {
        binding: 5,
        resource: diffuseSampler,
      },
      {
        binding: 6,
        resource: diffuseTexture.createView(),
      },
      {
        binding: 7,
        resource: {
          buffer: ambientLightBuffer,
        },
      },
      {
        binding: 8,
        resource: {
          buffer: diffuseLightBuffer,
        },
      },
      {
        binding: 10,
        resource: {
          buffer: positionLightBuffer,
        },
      },
    ]

    this.transformationBindGroup = device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: entries as Iterable<GPUBindGroupEntry>,
    })
  }

  public draw(passEncoder: GPURenderPassEncoder, device: GPUDevice) {
    this.updateTransformationMatrix()

    passEncoder.setPipeline(this.renderPipeline)
    device.queue.writeBuffer(
      this.transformationBuffer,
      0,
      this.transformMatrix.buffer,
      this.transformMatrix.byteOffset,
      this.transformMatrix.byteLength,
    )
    device.queue.writeBuffer(this.transformationBuffer, 64, this.rotateMatrix.buffer, this.rotateMatrix.byteOffset, this.rotateMatrix.byteLength)
    passEncoder.setVertexBuffer(0, this.verticesBuffer)
    passEncoder.setVertexBuffer(1, this.verticesBuffer)
    passEncoder.setBindGroup(0, this.transformationBindGroup)
    passEncoder.draw(this.vertices.length, 1, 0, 0)
  }

  private updateTransformationMatrix() {
    // MOVE / TRANSLATE OBJECT
    const transform = mat4.create()
    const rotate = mat4.create()

    mat4.translate(transform, transform, vec3.fromValues(this.x, this.y, this.z))
    mat4.rotateX(transform, transform, this.rotX)
    mat4.rotateY(transform, transform, this.rotY)
    mat4.rotateZ(transform, transform, this.rotZ)

    mat4.rotateX(rotate, rotate, this.rotX)
    mat4.rotateY(rotate, rotate, this.rotY)
    mat4.rotateZ(rotate, rotate, this.rotZ)

    // APPLY
    mat4.copy(this.transformMatrix, transform)
    mat4.copy(this.rotateMatrix, rotate)
  }

  private setTransformation(parameter?: ObjParameter) {
    if (parameter == null) {
      return
    }

    this.x = parameter.x ? parameter.x : 0
    this.y = parameter.y ? parameter.y : 0
    this.z = parameter.z ? parameter.z : 0

    this.rotX = parameter.rotX ? parameter.rotX : 0
    this.rotY = parameter.rotY ? parameter.rotY : 0
    this.rotZ = parameter.rotZ ? parameter.rotZ : 0

    this.scaleX = parameter.scaleX ? parameter.scaleX : 1
    this.scaleY = parameter.scaleY ? parameter.scaleY : 1
    this.scaleZ = parameter.scaleZ ? parameter.scaleZ : 1
  }

  public getMaterial(): Material {
    if (this.material) return this.material
    return this.defaultMaterial
  }
}
