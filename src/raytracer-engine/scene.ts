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
  objectMeshes: ObjLoader[] = []
  object: Object[]
  blas_consumed: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.triangles = []
    this.triangleIndices = []
    this.nodes = []
    this.object = []
    this.initialize()
  }

  initialize() {
    this.light = new Light(new Float32Array([50.0, 100.0, 50.0]))
    this.material = new Material()
    this.camera = new Camera([-15, 0, -5])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  async createObject(modelPath: string, position: vec3 = [0, 0, 0], rotation: vec3 = [0, 0, 0]) {
    const newObject = new Object(position, rotation)
    this.object.push(newObject)
    const objectMesh = new ObjLoader()
    await objectMesh.initialize(this.material, modelPath)

    objectMesh.triangles.forEach((tri) => {
      this.triangles.push(tri)
    })

    objectMesh.triangleIndices.forEach((index) => {
      this.triangleIndices.push(index)
    })

    this.tlasNodesMax = 2 * this.object.length - 1
    const blasNodesUsed: number = objectMesh.nodesUsed
    const existingNodesLength: number = this.nodes.length
    this.nodes.length += this.tlasNodesMax + blasNodesUsed - existingNodesLength

    for (var i: number = existingNodesLength; i < this.nodes.length; i += 1) {
      this.nodes[i] = new Node()
      this.nodes[i].leftChild = 0
      this.nodes[i].primitiveCount = 0
      this.nodes[i].minCorner = [0, 0, 0]
      this.nodes[i].maxCorner = [0, 0, 0]
    }
    this.objectMeshes.push(objectMesh)
  }

  update(frametime: number) {
    this.buildBVH()
  }

  buildBVH() {
    this.nodesUsed = 0

    this.blasDescriptions = new Array(this.object.length)
    this.blasIndices = new Array(this.object.length)
    for (var i: number = 0; i < this.object.length; i++) {
      var description: blasDescription = new blasDescription(
        this.objectMeshes[i].minCorner,
        this.objectMeshes[i].maxCorner,
        this.object[i].model,
      )
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
      return
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

  finalizeBVH() {
    let nodeOffset = this.tlasNodesMax

    this.objectMeshes.forEach((mesh) => {
      for (var i: number = 0; i < mesh.nodesUsed; i++) {
        var nodeToUpload = mesh.nodes[i]
        if (nodeToUpload.primitiveCount === 0) {
          nodeToUpload.leftChild += nodeOffset
        }
        if (nodeOffset + i >= this.nodes.length) {
          this.nodes.push(nodeToUpload)
        } else {
          this.nodes[nodeOffset + i] = nodeToUpload
        }
      }
      nodeOffset += mesh.nodesUsed
    })
  }
}
