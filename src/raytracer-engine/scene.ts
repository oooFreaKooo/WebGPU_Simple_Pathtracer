import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Node } from "./node"
import { Bin } from "./bin"
import { ObjectProperties } from "../utils/helper"

// Constants for SAH
const C_traversal = 1.0
const C_intersection = 1.0
const numBins = 16
const MAX_VALUE = 999999
const MIN_VALUE = -999999

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

  async createObjects(objects: ObjectProperties[]) {
    for (const obj of objects) {
      const { modelPath, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0] } = obj

      const objectMesh = new ObjLoader(material, position, scale, rotation, objects.indexOf(obj))

      await objectMesh.initialize(modelPath)

      this.triangles.push(...objectMesh.triangles)
      this.triangleIndices.push(...objectMesh.triangleIndices)

      objectMesh.objectID = objects.indexOf(obj)

      this.objectMeshes.push(objectMesh)
    }
  }

  buildBVH() {
    this.triangleIndices = Array.from({ length: this.triangles.length }, (_, i) => i)

    this.nodes = Array.from({ length: 2 * this.triangles.length - 1 }, () => new Node())

    const root = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = this.triangles.length
    this.nodesUsed = 1

    this.updateBounds(0)
    this.subdivide(0)
  }

  updateBounds(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    node.minCorner = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    node.maxCorner = [MIN_VALUE, MIN_VALUE, MIN_VALUE]

    for (let i = 0; i < node.primitiveCount; i++) {
      const triangle = this.triangles[this.triangleIndices[node.leftChild + i]]

      triangle.corners.forEach((corner) => {
        vec3.min(node.minCorner, node.minCorner, corner)
        vec3.max(node.maxCorner, node.maxCorner, corner)
      })
    }
  }
  subdivide(nodeIndex: number) {
    const node = this.nodes[nodeIndex]

    if (node.primitiveCount <= 2) return

    const extent: vec3 = vec3.subtract(vec3.create(), node.maxCorner, node.minCorner)
    const axis = extent[0] > extent[1] ? (extent[2] > extent[0] ? 2 : 0) : extent[2] > extent[1] ? 2 : 1

    const bins: Bin[] = Array.from({ length: numBins }, () => new Bin())

    for (let i = 0; i < node.primitiveCount; i++) {
      const triangle = this.triangles[this.triangleIndices[node.leftChild + i]]
      const binIndex = Math.min(numBins - 1, Math.floor(((triangle.centroid[axis] - node.minCorner[axis]) / extent[axis]) * numBins))

      bins[binIndex].addTriangle(triangle)
    }

    const totalArea = bins.reduce((sum, bin) => sum + bin.surfaceArea(), 0)
    let bestCost = C_intersection * node.primitiveCount
    let bestSplit = -1
    let leftCount = 0
    let leftArea = 0
    let rightArea = totalArea

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

    if (bestSplit === -1) return

    const splitValue = node.minCorner[axis] + (extent[axis] * (bestSplit + 1)) / numBins
    let mid = node.leftChild
    let end = node.leftChild + node.primitiveCount - 1

    while (mid <= end) {
      const triangle = this.triangles[this.triangleIndices[mid]]
      if (triangle.centroid[axis] < splitValue) {
        mid++
      } else {
        ;[this.triangleIndices[mid], this.triangleIndices[end]] = [this.triangleIndices[end], this.triangleIndices[mid]]
        end--
      }
    }

    const [leftChildIndex, rightChildIndex] = [this.nodesUsed++, this.nodesUsed++]

    this.nodes[leftChildIndex] = this.nodes[leftChildIndex] || new Node()
    this.nodes[rightChildIndex] = this.nodes[rightChildIndex] || new Node()

    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = mid - node.leftChild

    this.nodes[rightChildIndex].leftChild = mid
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - this.nodes[leftChildIndex].primitiveCount

    if (this.nodes[leftChildIndex].primitiveCount === 0 || this.nodes[rightChildIndex].primitiveCount === 0) return

    node.leftChild = leftChildIndex
    node.primitiveCount = 0

    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }

  update(frametime: number) {
    this.objectMeshes.forEach((statue) => {
      statue.update(frametime / 16.667)
    })
    this.buildBVH()
  }
}
