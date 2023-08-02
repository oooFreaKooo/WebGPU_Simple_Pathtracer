import { color_buffer_view, sceneParameters, sky_texture, lightBuffer, sampler, device } from "./renderer2"
import raytracer_kernel from "../assets/shaders//raytracer_kernel.wgsl"
import screen_shader from "../assets/shaders/screen_shader.wgsl"
import { mat4, vec2, vec3 } from "gl-matrix"
import { deg2Rad } from "./math"
import { ObjLoader } from "./obj-loader"
import { Node } from "./node"
import { Triangle } from "./triangle"
import { blasDescription } from "./blas_description"
import { Node3d } from "../objects/Node3d"
import { ObjParameter } from "../utils/helper"

const MAX_VALUE = 999999
const MIN_VALUE = -999999

export class ObjMeshRT extends Node3d {
  public x: number = 0
  public y: number = 0
  public z: number = 0

  public rotX: number = 0
  public rotY: number = 0
  public rotZ: number = 0

  public scaleX: number = 1
  public scaleY: number = 1
  public scaleZ: number = 1
  // Assets
  triangleBuffer: GPUBuffer
  nodeBuffer: GPUBuffer
  blasDescriptionBuffer: GPUBuffer
  triangleIndexBuffer: GPUBuffer
  blasIndexBuffer: GPUBuffer

  // Pipeline objects
  ray_tracing_pipeline: GPUComputePipeline
  ray_tracing_bind_group_layout: GPUBindGroupLayout
  ray_tracing_bind_group: GPUBindGroup
  screen_pipeline: GPURenderPipeline
  screen_bind_group_layout: GPUBindGroupLayout
  screen_bind_group: GPUBindGroup

  // Properties from the Object class
  model = mat4.create()
  vertices: vec3[]
  textureCoords: vec2[]
  vertexNormals: vec3[]
  minCorner: vec3
  maxCorner: vec3

  triangles: Triangle[] = []
  triangleIndices: number[] = []
  nodes: Node[] = []
  nodesUsed = 0
  blasDescription: blasDescription
  loaded: boolean
  frametime: number

  constructor(
    objData: {
      triangles: Triangle[]
      nodes: Node[]
      triangleIndices: number[]
      vertices: vec3[]
      textureCoords: vec2[]
      vertexNormals: vec3[]
      minCorner: vec3
      maxCorner: vec3
    },
    parameter?: ObjParameter,
  ) {
    super(parameter)
    super.rotate(this.rotX, this.rotY, this.rotZ)
    super.translate(this.x, this.y, this.z)
    super.scale(this.scaleX, this.scaleY, this.scaleZ)
    this.setTransformation(parameter)
    Object.assign(this, objData)
    this.init()
  }

  async init(): Promise<void> {
    await Promise.all([
      this.makeBindGroupLayouts(),
      this.createAssets(),
      this.makeBindGroups(),
      this.makePipelines(),
      this.buildBVH(),
      this.prepareScene(),
    ])
  }

  async makeBindGroupLayouts() {
    this.ray_tracing_bind_group_layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: "write-only",
            format: "rgba8unorm",
            viewDimension: "2d",
          },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 5,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 6,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
          },
        },
        {
          binding: 7,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            viewDimension: "cube",
          },
        },
        {
          binding: 8,
          visibility: GPUShaderStage.COMPUTE,
          sampler: {},
        },
        {
          binding: 9,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
          },
        },
      ],
    })

    this.screen_bind_group_layout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    })
  }

  async buildBVH() {
    this.nodesUsed = 0
    this.blasDescription = new blasDescription(this.minCorner, this.maxCorner, this.model)
    this.resetNodes()
    this.setRootNode()
    this.updateBounds(0)
    this.subdivide(0)
  }

  private resetNodes() {
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].leftChild = 0
      this.nodes[i].primitiveCount = 0
      this.nodes[i].minCorner = [0, 0, 0]
      this.nodes[i].maxCorner = [0, 0, 0]
    }
  }

  private setRootNode() {
    const root = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = 1 // Only one object
    this.nodesUsed += 1
  }

  updateBounds(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    node.minCorner = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    node.maxCorner = [MIN_VALUE, MIN_VALUE, MIN_VALUE]
    vec3.min(node.minCorner, node.minCorner, this.blasDescription.minCorner)
    vec3.max(node.maxCorner, node.maxCorner, this.blasDescription.maxCorner)
  }

  subdivide(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    if (node.primitiveCount < 2) return
    const extent = vec3.subtract(vec3.create(), node.maxCorner, node.minCorner)
    const axis = this.getSplitAxis(extent)
    const splitPosition = node.minCorner[axis] + extent[axis] / 2
    this.partitionblasDescription(node, splitPosition, axis)
  }

  private getSplitAxis(extent: vec3): number {
    let axis = 0
    if (extent[1] > extent[axis]) axis = 1
    if (extent[2] > extent[axis]) axis = 2
    return axis
  }

  private partitionblasDescription(node: Node, splitPosition: number, axis: number) {
    if (this.blasDescription.center[axis] < splitPosition) {
      this.createChildNodes(node, true)
    } else {
      this.createChildNodes(node, false)
    }
  }

  private createChildNodes(node: Node, isLeft: boolean) {
    if (isLeft) {
      node.leftChild = this.nodesUsed++
      this.nodes[node.leftChild].primitiveCount = 1
    } else {
      const rightChildIndex = this.nodesUsed++
      this.nodes[rightChildIndex].leftChild = node.leftChild + 1
      this.nodes[rightChildIndex].primitiveCount = 1
    }
    this.updateBounds(node.leftChild)
  }

  finalizeBVH() {
    for (let i = 0; i < this.nodesUsed; i++) {
      const nodeToUpload = this.nodes[i]
      this.nodes[i] = nodeToUpload
    }
  }

  async createAssets() {
    const triangleBufferDescriptor: GPUBufferDescriptor = {
      size: 112 * this.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleBuffer = device.createBuffer(triangleBufferDescriptor)

    const nodeBufferDescriptor: GPUBufferDescriptor = {
      size: 32 * this.nodes.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.nodeBuffer = device.createBuffer(nodeBufferDescriptor)

    const blasDescriptionBufferDescriptor: GPUBufferDescriptor = {
      size: 80,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.blasDescriptionBuffer = device.createBuffer(blasDescriptionBufferDescriptor)

    const triangleIndexBufferDescriptor: GPUBufferDescriptor = {
      size: 4 * this.triangles.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.triangleIndexBuffer = device.createBuffer(triangleIndexBufferDescriptor)

    const blasIndexBufferDescriptor: GPUBufferDescriptor = {
      size: 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }
    this.blasIndexBuffer = device.createBuffer(blasIndexBufferDescriptor)
  }

  async makeBindGroups() {
    this.ray_tracing_bind_group = device.createBindGroup({
      layout: this.ray_tracing_bind_group_layout,
      entries: [
        {
          binding: 0,
          resource: color_buffer_view,
        },
        {
          binding: 1,
          resource: {
            buffer: sceneParameters,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: this.triangleBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: this.nodeBuffer,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: this.blasDescriptionBuffer,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: this.triangleIndexBuffer,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: this.blasIndexBuffer,
          },
        },
        {
          binding: 7,
          resource: sky_texture.view,
        },
        {
          binding: 8,
          resource: sky_texture.sampler,
        },
        {
          binding: 9,
          resource: {
            buffer: lightBuffer,
          },
        },
      ],
    })

    this.screen_bind_group = device.createBindGroup({
      layout: this.screen_bind_group_layout,
      entries: [
        {
          binding: 0,
          resource: sampler,
        },
        {
          binding: 1,
          resource: color_buffer_view,
        },
      ],
    })
  }

  async makePipelines() {
    const ray_tracing_pipeline_layout = device.createPipelineLayout({
      bindGroupLayouts: [this.ray_tracing_bind_group_layout],
    })

    this.ray_tracing_pipeline = device.createComputePipeline({
      layout: ray_tracing_pipeline_layout,

      compute: {
        module: device.createShaderModule({ code: raytracer_kernel }),
        entryPoint: "main",
      },
    })

    const screen_pipeline_layout = device.createPipelineLayout({
      bindGroupLayouts: [this.screen_bind_group_layout],
    })

    this.screen_pipeline = device.createRenderPipeline({
      layout: screen_pipeline_layout,

      vertex: {
        module: device.createShaderModule({
          code: screen_shader,
        }),
        entryPoint: "vert_main",
      },

      fragment: {
        module: device.createShaderModule({
          code: screen_shader,
        }),
        entryPoint: "frag_main",
        targets: [
          {
            format: "bgra8unorm",
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
      },
    })
  }
  async prepareScene() {
    const blasDescriptionData: Float32Array = new Float32Array(20)
    for (let j = 0; j < 16; j++) {
      blasDescriptionData[j] = <number>this.blasDescription.inverseModel.at(j)
    }
    blasDescriptionData[16] = this.blasDescription.rootNodeIndex
    blasDescriptionData[17] = this.blasDescription.rootNodeIndex
    blasDescriptionData[18] = this.blasDescription.rootNodeIndex
    blasDescriptionData[19] = this.blasDescription.rootNodeIndex
    device.queue.writeBuffer(this.blasDescriptionBuffer, 0, blasDescriptionData)

    // Write the nodes
    const nodeData: Float32Array = new Float32Array(8 * this.nodesUsed)
    for (let i = 0; i < this.nodesUsed; i++) {
      nodeData[8 * i] = this.nodes[i].minCorner[0]
      nodeData[8 * i + 1] = this.nodes[i].minCorner[1]
      nodeData[8 * i + 2] = this.nodes[i].minCorner[2]
      nodeData[8 * i + 3] = this.nodes[i].leftChild
      nodeData[8 * i + 4] = this.nodes[i].maxCorner[0]
      nodeData[8 * i + 5] = this.nodes[i].maxCorner[1]
      nodeData[8 * i + 6] = this.nodes[i].maxCorner[2]
      nodeData[8 * i + 7] = this.nodes[i].primitiveCount
    }
    device.queue.writeBuffer(this.nodeBuffer, 0, nodeData)

    /*     if (this.loaded) {
      return
    } */
    this.loaded = true
    const triangleData: Float32Array = new Float32Array(28 * this.triangles.length)
    for (let i = 0; i < this.triangles.length; i++) {
      for (var corner = 0; corner < 3; corner++) {
        triangleData[28 * i + 8 * corner] = this.triangles[i].corners[corner][0]
        triangleData[28 * i + 8 * corner + 1] = this.triangles[i].corners[corner][1]
        triangleData[28 * i + 8 * corner + 2] = this.triangles[i].corners[corner][2]
        triangleData[28 * i + 8 * corner + 3] = 0.0

        triangleData[28 * i + 8 * corner + 4] = this.triangles[i].normals[corner][0]
        triangleData[28 * i + 8 * corner + 5] = this.triangles[i].normals[corner][1]
        triangleData[28 * i + 8 * corner + 6] = this.triangles[i].normals[corner][2]
        triangleData[28 * i + 8 * corner + 7] = 0.0
      }
      for (var channel = 0; channel < 3; channel++) {
        triangleData[28 * i + 24 + channel] = this.triangles[i].color[channel]
      }
      triangleData[28 * i + 27] = 0.0
    }
    device.queue.writeBuffer(this.triangleBuffer, 0, triangleData, 0, 28 * this.triangles.length)

    //Write blas data for the single object
    var nodeData_b = new Float32Array(8 * this.nodesUsed)
    for (let i = 0; i < this.nodesUsed; i++) {
      let baseIndex: number = i
      nodeData_b[8 * i] = this.nodes[baseIndex].minCorner[0]
      nodeData_b[8 * i + 1] = this.nodes[baseIndex].minCorner[1]
      nodeData_b[8 * i + 2] = this.nodes[baseIndex].minCorner[2]
      nodeData_b[8 * i + 3] = this.nodes[baseIndex].leftChild
      nodeData_b[8 * i + 4] = this.nodes[baseIndex].maxCorner[0]
      nodeData_b[8 * i + 5] = this.nodes[baseIndex].maxCorner[1]
      nodeData_b[8 * i + 6] = this.nodes[baseIndex].maxCorner[2]
      nodeData_b[8 * i + 7] = this.nodes[baseIndex].primitiveCount
    }
    device.queue.writeBuffer(this.nodeBuffer, 0, nodeData_b, 0, 8 * this.nodesUsed)

    const triangleIndexData: Float32Array = new Float32Array(this.triangles.length)
    for (let i = 0; i < this.triangles.length; i++) {
      triangleIndexData[i] = this.triangleIndices[i]
    }
    device.queue.writeBuffer(this.triangleIndexBuffer, 0, triangleIndexData, 0, this.triangles.length)
  }

  public drawCombined(pass: GPUComputePassEncoder | GPURenderPassEncoder, canvas: HTMLCanvasElement): void {
    this.prepareScene()

    if (pass instanceof GPUComputePassEncoder) {
      pass.setPipeline(this.ray_tracing_pipeline)
      pass.setBindGroup(0, this.ray_tracing_bind_group)
      pass.dispatchWorkgroups(canvas.width / 8, canvas.height / 8, 1)
    } else if (pass instanceof GPURenderPassEncoder) {
      pass.setPipeline(this.screen_pipeline)
      pass.setBindGroup(0, this.screen_bind_group)
      pass.draw(6, 1, 0, 0)
    }
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
}
