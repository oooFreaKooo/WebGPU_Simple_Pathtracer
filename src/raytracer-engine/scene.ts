import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Node } from "./node"
import { Material } from "./material"

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
    this.camera = new Camera([0, 5, -15])
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
      if (this.triangles[this.triangleIndices[i]].centroid[axis] < splitPosition) {
        i += 1
      } else {
        var temp: number = this.triangleIndices[i]
        this.triangleIndices[i] = this.triangleIndices[j]
        this.triangleIndices[j] = temp
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

  update(frametime: number) {
    //this.buildBVH()
  }
}
