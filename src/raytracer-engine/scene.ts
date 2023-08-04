import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { Light } from "./light"
import { blasDescription } from "./blas_description"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Object } from "./object"
import { Node } from "./node"
import { Material } from "./material"

export class Scene {
  canvas: HTMLCanvasElement
  camera: Camera
  cameraControls: Controls
  light: Light
  material: Material
  triangles: Triangle[]
  triangleIndices: number[]
  nodes: Node[]
  nodesUsed: number = 0
  tlasNodesMax: number
  blasIndices: number[]
  blasDescriptions: blasDescription[]
  objectMesh: ObjLoader[] = []
  object: Object[]
  blas_consumed: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.triangles = []
    this.triangleIndices = []
    this.nodes = []
    this.object = []
    this.objectMesh = new Array()
    this.initialize()
  }

  initialize() {
    this.light = new Light(new Float32Array([50.0, 100.0, 50.0]), new Float32Array([1.0, 1.0, 1.0]), 1.0, 2.0)
    this.material = new Material()
    this.camera = new Camera([-15, 0, -5])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  async loadObject(color: vec3, modelPath: string, position: vec3 = [1, 1, 1], rotation: vec3 = [0, 0, 0]) {
    console.log(`Loading object from ${modelPath}...`)

    const newObjectMesh = new ObjLoader()
    await newObjectMesh.initialize(color, modelPath)

    this.objectMesh.push(newObjectMesh)

    this.object.push(new Object(position, rotation))

    const currentTriangleCount = this.triangles.length
    console.log(`Current triangle count: ${currentTriangleCount}`)

    newObjectMesh.triangles.forEach((tri) => {
      this.triangles.push(tri)
    })
    console.log(`Triangles added from new object: ${newObjectMesh.triangles.length}`)
    newObjectMesh.triangleIndices.forEach((index) => {
      this.triangleIndices.push(index + currentTriangleCount)
    })
    console.log(`Updated triangle count: ${this.triangles.length}`)
    const totalNodesUsed = this.objectMesh.reduce((sum, mesh) => sum + mesh.nodesUsed, 0)

    this.tlasNodesMax = 2 * this.object.length - 1

    const newNodeCount = this.tlasNodesMax + totalNodesUsed - (this.nodes ? this.nodes.length : 0)

    for (let i: number = 0; i < newNodeCount; i += 1) {
      const newNode = new Node()
      newNode.leftChild = 0
      newNode.primitiveCount = 0
      newNode.minCorner = [0, 0, 0]
      newNode.maxCorner = [0, 0, 0]
      this.nodes.push(newNode)
    }
  }

  update(frametime: number) {
    /*     this.object.forEach((obj) => {
      obj.update(frametime / 16.667 / 2)
    }) */
    this.buildBVH()
  }

  async buildBVH() {
    let totalBlasNodesUsed = 0

    for (let mesh of this.objectMesh) {
      totalBlasNodesUsed += mesh.nodesUsed
    }

    this.nodesUsed = 0

    this.blasDescriptions = new Array(this.object.length)
    this.blasIndices = new Array(this.object.length)

    for (let i = 0; i < this.object.length; i++) {
      var description: blasDescription = new blasDescription(this.objectMesh[i].minCorner, this.objectMesh[i].maxCorner, this.object[i].model)
      description.rootNodeIndex = this.tlasNodesMax

      this.blasDescriptions[i] = description
      this.blasIndices[i] = i
    }

    for (var i: number = 0; i < this.tlasNodesMax; i += 1) {
      this.nodes[i].leftChild = 0
      this.nodes[i].primitiveCount = 0
      this.nodes[i].minCorner = [0, 0, 0]
      this.nodes[i].maxCorner = [0, 0, 0]
    }

    var root: Node = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = this.blasDescriptions.length
    this.nodesUsed += 1

    this.updateBounds(0)
    this.subdivide(0)
  }

  updateBounds(nodeIndex: number) {
    var node: Node = this.nodes[nodeIndex]
    node.minCorner = [999999, 999999, 999999]
    node.maxCorner = [-999999, -999999, -999999]

    for (var i: number = 0; i < node.primitiveCount; i += 1) {
      const description: blasDescription = this.blasDescriptions[this.blasIndices[node.leftChild + i]]
      vec3.min(node.minCorner, node.minCorner, description.minCorner)
      vec3.max(node.maxCorner, node.maxCorner, description.maxCorner)
    }
  }

  subdivide(nodeIndex: number) {
    var node: Node = this.nodes[nodeIndex]

    if (node.primitiveCount < 2) {
      return
    }

    var extent: vec3 = [0, 0, 0]
    vec3.subtract(extent, node.maxCorner, node.minCorner)
    var axis: number = 0
    if (extent[1] > extent[axis]) {
      axis = 1
    }
    if (extent[2] > extent[axis]) {
      axis = 2
    }

    const splitPosition: number = node.minCorner[axis] + extent[axis] / 2

    var i: number = node.leftChild
    var j: number = i + node.primitiveCount - 1

    while (i <= j) {
      if (this.blasDescriptions[this.blasIndices[i]].center[axis] < splitPosition) {
        i += 1
      } else {
        var temp: number = this.blasIndices[i]
        this.blasIndices[i] = this.blasIndices[j]
        this.blasIndices[j] = temp
        j -= 1
      }
    }

    var leftCount: number = i - node.leftChild
    if (leftCount == 0 || leftCount == node.primitiveCount) {
      // if partitioning failed, fall back to evenly dividing along the axis
      leftCount = Math.floor(node.primitiveCount / 2)
      i = node.leftChild + leftCount
    }

    const leftChildIndex: number = this.nodesUsed
    this.nodesUsed += 1
    const rightChildIndex: number = this.nodesUsed
    this.nodesUsed += 1

    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = leftCount

    this.nodes[rightChildIndex].leftChild = i
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount

    node.leftChild = leftChildIndex
    node.primitiveCount = 0

    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }

  async finalizeBVH() {
    for (let mesh of this.objectMesh) {
      for (let i = 0; i < mesh.nodesUsed; i++) {
        let nodeToUpload = mesh.nodes[i]
        if (nodeToUpload.primitiveCount == 0) {
          nodeToUpload.leftChild += this.tlasNodesMax
        }
        this.nodes[this.tlasNodesMax + i] = nodeToUpload
      }
    }
  }
}
