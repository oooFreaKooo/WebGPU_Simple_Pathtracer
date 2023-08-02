import { color_buffer_view, sceneParameters, sky_texture, lightBuffer, sampler, device } from "./renderer2"
import raytracer_kernel from "../assets/shaders//raytracer_kernel.wgsl"
import screen_shader from "../assets/shaders/screen_shader.wgsl"
import { mat4, vec2, vec3 } from "gl-matrix"
import { getTriangleCenter } from "./math"
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
  model: mat4
  vertices: vec3[]
  textureCoords: vec2[]
  vertexNormals: vec3[]
  minCorner: vec3
  maxCorner: vec3

  triangles: Triangle[] = []
  triangleIndices: number[] = []
  nodes: Node[] = []

  loaded: boolean = false
  blas_consumed: boolean = false
  frametime: number

  // BVH properties
  nodesUsed: number = 0
  tlasNodesMax: number
  blasDescription: blasDescription[] = []

  blasIndices: number[] = []

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
    this.setTransformation(parameter)

    // Initialize the model matrix
    this.model = mat4.create()
    // Apply transformations to the model matrix
    mat4.translate(this.model, this.model, [this.x, this.y, this.z])
    mat4.rotateX(this.model, this.model, this.rotX)
    mat4.rotateY(this.model, this.model, this.rotY)
    mat4.rotateZ(this.model, this.model, this.rotZ)
    mat4.scale(this.model, this.model, [this.scaleX, this.scaleY, this.scaleZ])

    Object.assign(this, objData)
    this.init()
  }

  async init(): Promise<void> {
    await Promise.all([
      this.makeBindGroupLayouts(),
      this.buildBVH(),
      this.createAssets(),
      this.makeBindGroups(),
      this.makePipelines(),
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

  buildBVH() {
    this.nodesUsed = 0

    // Assuming the ObjMeshRT class has its own method or property to get blasDescriptions
    this.blasDescription = this.getBlasDescription()
    this.blasIndices = Array.from({ length: this.blasDescription.length }, (_, i) => i)

    const rootNode = new Node()
    rootNode.leftChild = 0
    rootNode.primitiveCount = this.blasDescription.length
    this.nodes[0] = rootNode
    this.nodesUsed += 1

    this.updateBounds(0)
    this.subdivide(0)
  }

  updateBounds(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    node.minCorner = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    node.maxCorner = [MIN_VALUE, MIN_VALUE, MIN_VALUE]

    for (let i = 0; i < node.primitiveCount; i++) {
      const description = this.blasDescription[this.blasIndices[node.leftChild + i]]
      for (let j = 0; j < 3; j++) {
        node.minCorner[j] = Math.min(node.minCorner[j], description.minCorner[j])
        node.maxCorner[j] = Math.max(node.maxCorner[j], description.maxCorner[j])
      }
    }
  }

  subdivide(nodeIndex: number) {
    const node = this.nodes[nodeIndex]

    if (node.primitiveCount < 2) return

    const extent = [node.maxCorner[0] - node.minCorner[0], node.maxCorner[1] - node.minCorner[1], node.maxCorner[2] - node.minCorner[2]]
    let axis = 0
    if (extent[1] > extent[0]) axis = 1
    if (extent[2] > extent[axis]) axis = 2

    const splitPosition = node.minCorner[axis] + extent[axis] / 2

    let i = node.leftChild
    let j = i + node.primitiveCount - 1

    while (i <= j) {
      if (this.blasDescription[this.blasIndices[i]].center[axis] < splitPosition) {
        i++
      } else {
        const temp = this.blasIndices[i]
        this.blasIndices[i] = this.blasIndices[j]
        this.blasIndices[j] = temp
        j--
      }
    }

    const leftCount = i - node.leftChild
    if (leftCount === 0 || leftCount === node.primitiveCount) return

    const leftChildIndex = this.nodesUsed++
    const rightChildIndex = this.nodesUsed++

    this.nodes[leftChildIndex] = new Node()
    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = leftCount

    this.nodes[rightChildIndex] = new Node()
    this.nodes[rightChildIndex].leftChild = i
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount

    node.leftChild = leftChildIndex
    node.primitiveCount = 0

    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }

  finalizeBVH() {
    // Assuming the ObjMeshRT class has its own nodes
    for (let i = 0; i < this.nodesUsed; i++) {
      const nodeToUpload = this.nodes[i]
      if (nodeToUpload.primitiveCount === 0) {
        nodeToUpload.leftChild += this.tlasNodesMax
      }
      this.nodes[this.tlasNodesMax + i] = nodeToUpload
    }
  }

  getBlasDescription(): blasDescription[] {
    const descriptions: blasDescription[] = []

    for (const triangle of this.triangles) {
      // Compute the bounding box for the triangle
      const minCorner: vec3 = new Float32Array([MAX_VALUE, MAX_VALUE, MAX_VALUE])
      const maxCorner: vec3 = new Float32Array([MIN_VALUE, MIN_VALUE, MIN_VALUE])

      for (const corner of triangle.corners) {
        for (let i = 0; i < 3; i++) {
          minCorner[i] = Math.min(minCorner[i], corner[i])
          maxCorner[i] = Math.max(maxCorner[i], corner[i])
        }
      }

      // Create a blasDescription for the triangle
      // Using the model matrix of the ObjMeshRT class for the transformation
      const description = new blasDescription(minCorner, maxCorner, this.model)
      descriptions.push(description)
    }

    return descriptions
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
      blasDescriptionData[j] = <number>this.blasDescription[0].inverseModel.at(j)
    }
    blasDescriptionData[16] = this.blasDescription[0].rootNodeIndex
    blasDescriptionData[17] = this.blasDescription[0].rootNodeIndex
    blasDescriptionData[18] = this.blasDescription[0].rootNodeIndex
    blasDescriptionData[19] = this.blasDescription[0].rootNodeIndex
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

    if (this.loaded) {
      return
    }
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
