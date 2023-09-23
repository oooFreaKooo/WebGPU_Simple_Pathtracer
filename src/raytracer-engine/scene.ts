import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { AABB, Node } from "./node"
import { ObjectProperties } from "../utils/helper"

const MAX_VALUE = Number.POSITIVE_INFINITY
const MIN_VALUE = Number.NEGATIVE_INFINITY

export class Scene {
  canvas: HTMLCanvasElement
  camera: Camera
  cameraControls: Controls

  triangles: Triangle[]

  triangleIndices: number[]
  nodes: Node[]
  nodesUsed: number = 0
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

      const objectMesh = new ObjLoader(material, position, scale, rotation)

      await objectMesh.initialize(modelPath)

      this.objectMeshes.push(objectMesh)
    }
    await this.prepareBVH()
  }

  async prepareBVH() {
    this.triangles = []

    // Iterate through all objectMeshes
    this.objectMeshes.forEach((objectMesh) => {
      objectMesh.triangles.forEach((triangle) => {
        this.triangles.push(triangle)
      })
    })

    this.triangleIndices = new Array(this.triangles.length)
    for (var i: number = 0; i < this.triangles.length; i += 1) {
      this.triangleIndices[i] = i
    }

    this.nodes = new Array(2 * this.triangles.length - 1)
    for (var i: number = 0; i < 2 * this.triangles.length - 1; i += 1) {
      this.nodes[i] = new Node()
    }
    this.buildBVH()
  }

  buildBVH() {
    var root = this.nodes[0]
    root.leftFirst = 0
    root.triCount = this.triangles.length
    this.nodesUsed = 1

    this.updateNodeBounds(0)
    this.subdivide(0)
  }

  updateNodeBounds(nodeIndex: number) {
    var node = this.nodes[nodeIndex]
    node.aabbMin = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    node.aabbMax = [MIN_VALUE, MIN_VALUE, MIN_VALUE]

    for (var i = 0; i < node.triCount; i++) {
      const leafTri = this.triangles[this.triangleIndices[node.leftFirst + i]]

      leafTri.corners.forEach((corner) => {
        vec3.min(node.aabbMin, node.aabbMin, corner)
        vec3.max(node.aabbMax, node.aabbMax, corner)
      })
    }
  }

  subdivide(nodeIdx: number): void {
    const node = this.nodes[nodeIdx]

    let bestAxis: number = -1
    let bestPos: number = 0
    let bestCost: number = Infinity

    for (let axis = 0; axis < 3; axis++) {
      for (let i = 0; i < node.triCount; i++) {
        const triangle = this.triangles[this.triangleIndices[node.leftFirst + i]]
        const candidatePos = triangle.centroid[axis]
        const cost = this.evaluateSAH(node, axis, candidatePos)
        if (cost < bestCost) {
          bestPos = candidatePos
          bestAxis = axis
          bestCost = cost
        }
      }
    }

    const e: vec3 = [0, 0, 0]
    vec3.subtract(e, node.aabbMax, node.aabbMin)
    const parentArea = e[0] * e[1] + e[1] * e[2] + e[2] * e[0]
    const parentCost = node.triCount * parentArea

    if (bestCost >= parentCost) return

    let i = node.leftFirst
    let j = i + node.triCount - 1
    while (i <= j) {
      if (this.triangles[this.triangleIndices[i]].centroid[bestAxis] < bestPos) {
        i++
      } else {
        var temp: number = this.triangleIndices[i]
        this.triangleIndices[i] = this.triangleIndices[j]
        this.triangleIndices[j] = temp
        j -= 1
      }
    }

    const leftCount = i - node.leftFirst
    if (leftCount == 0 || leftCount == node.triCount) return

    const leftChildIdx = this.nodesUsed
    this.nodesUsed++
    const rightChildIdx = this.nodesUsed
    this.nodesUsed++

    this.nodes[leftChildIdx].leftFirst = node.leftFirst
    this.nodes[leftChildIdx].triCount = leftCount

    this.nodes[rightChildIdx].leftFirst = i
    this.nodes[rightChildIdx].triCount = node.triCount - leftCount

    node.leftFirst = leftChildIdx
    node.triCount = 0

    this.updateNodeBounds(leftChildIdx)
    this.updateNodeBounds(rightChildIdx)

    this.subdivide(leftChildIdx)
    this.subdivide(rightChildIdx)
  }

  // https://jacco.ompf2.com/2022/04/18/how-to-build-a-bvh-part-2-faster-rays/
  evaluateSAH(node: Node, axis: number, pos: number): number {
    const leftBox = new AABB()
    const rightBox = new AABB()
    let leftCount = 0
    let rightCount = 0

    for (let i = 0; i < node.triCount; i++) {
      const triangle = this.triangles[this.triangleIndices[node.leftFirst + i]]
      if (triangle.centroid[axis] < pos) {
        leftCount++
        triangle.corners.forEach((corner) => leftBox.grow(corner))
      } else {
        rightCount++
        triangle.corners.forEach((corner) => rightBox.grow(corner))
      }
    }

    const cost = leftCount * leftBox.area() + rightCount * rightBox.area()
    return cost > 0 ? cost : Infinity
  }

  update(frametime: number) {
    //this.buildBVH()
  }
}
