import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Node } from "./node"
import { Material } from "./material"
import { Bin } from "./bin"

// Constants for SAH
const C_traversal = 1.0
const C_intersection = 1.0
const numBins = 16

export class Scene {
  canvas: HTMLCanvasElement
  camera: Camera
  cameraControls: Controls

  triangles: Triangle[] = []
  triangleIndices: number[] = []
  nodes: Node[]
  nodesUsed: number = 0
  tlasNodesMax: number
  objectMeshes: ObjLoader[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initialize()
  }

  initialize() {
    this.camera = new Camera([0, 2.5, -10])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  async createObject(modelPath: string, material: Material, position: vec3 = [0, 0, 0], scale: vec3 = [1, 1, 1], rotation: vec3 = [0, 0, 0]) {
    const objectMesh = new ObjLoader(material, position, scale, rotation)
    await objectMesh.initialize(modelPath)

    objectMesh.triangles.forEach((tri) => {
      this.triangles.push(tri)
    })
    objectMesh.triangleIndices.forEach((index) => {
      this.triangleIndices.push(index)
    })

    this.objectMeshes.push(objectMesh)
  }

  buildBVH() {
    this.triangleIndices = new Array(this.triangles.length)
    for (var i: number = 0; i < this.triangles.length; i += 1) {
      this.triangleIndices[i] = i
    }

    this.nodes = new Array(2 * this.triangles.length - 1)
    for (var i: number = 0; i < 2 * this.triangles.length - 1; i += 1) {
      this.nodes[i] = new Node()
    }

    var root: Node = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = this.triangles.length
    this.nodesUsed = 1

    this.updateBounds(0)
    this.subdivide(0)
  }

  updateBounds(nodeIndex: number) {
    var node: Node = this.nodes[nodeIndex]
    node.minCorner = [999999, 999999, 999999]
    node.maxCorner = [-999999, -999999, -999999]

    for (var i: number = 0; i < node.primitiveCount; i += 1) {
      const triangle: Triangle = this.triangles[this.triangleIndices[node.leftChild + i]]

      triangle.corners.forEach((corner: vec3) => {
        vec3.min(node.minCorner, node.minCorner, corner)
        vec3.max(node.maxCorner, node.maxCorner, corner)
      })
    }
  }
  subdivide(nodeIndex: number) {
    var node: Node = this.nodes[nodeIndex]

    if (node.primitiveCount <= 2) {
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

    var bins: Bin[] = new Array(numBins)
    for (let i = 0; i < numBins; i++) {
      bins[i] = new Bin()
    }

    for (let i = 0; i < node.primitiveCount; i++) {
      const triangle: Triangle = this.triangles[this.triangleIndices[node.leftChild + i]]
      const binIndex: number = Math.min(numBins - 1, Math.floor(((triangle.centroid[axis] - node.minCorner[axis]) / extent[axis]) * numBins))

      bins[binIndex].addTriangle(triangle)
    }

    var totalArea = bins.reduce((sum, bin) => sum + bin.surfaceArea(), 0)
    var bestCost = C_intersection * node.primitiveCount
    var bestSplit = -1
    var leftCount = 0
    var leftArea = 0
    var rightArea = totalArea
    for (let i = 0; i < numBins - 1; i++) {
      leftCount += bins[i].count
      leftArea += bins[i].surfaceArea()
      rightArea -= bins[i].surfaceArea()

      const cost =
        C_traversal + C_intersection * ((leftArea / totalArea) * leftCount + (rightArea / totalArea) * (node.primitiveCount - leftCount))

      if (cost < bestCost) {
        bestCost = cost
        bestSplit = i
      }
    }

    if (bestSplit === -1) {
      return
    }

    // Partition triangles based on the best split
    const splitValue = node.minCorner[axis] + (extent[axis] * (bestSplit + 1)) / numBins
    var mid = node.leftChild
    var end = node.leftChild + node.primitiveCount - 1

    while (mid <= end) {
      const triangle: Triangle = this.triangles[this.triangleIndices[mid]]
      if (triangle.centroid[axis] < splitValue) {
        mid++
      } else {
        ;[this.triangleIndices[mid], this.triangleIndices[end]] = [this.triangleIndices[end], this.triangleIndices[mid]]
        end--
      }
    }

    // Create child nodes
    const leftChildIndex: number = this.nodesUsed++
    const rightChildIndex: number = this.nodesUsed++

    if (!this.nodes[leftChildIndex]) {
      this.nodes[leftChildIndex] = new Node()
    }

    if (!this.nodes[rightChildIndex]) {
      this.nodes[rightChildIndex] = new Node()
    }

    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = mid - node.leftChild

    this.nodes[rightChildIndex].leftChild = mid
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - this.nodes[leftChildIndex].primitiveCount

    // Check if both child nodes receive at least one triangle
    if (this.nodes[leftChildIndex].primitiveCount === 0 || this.nodes[rightChildIndex].primitiveCount === 0) {
      return
    }

    node.leftChild = leftChildIndex
    node.primitiveCount = 0

    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }

  update(frametime: number) {
    //this.buildBVH()
  }
}
