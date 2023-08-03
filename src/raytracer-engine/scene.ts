import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { Light } from "./light"
import { blasDescription } from "./blas_description"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Object } from "./object"
import { Node } from "./node"

const DEFAULT_SPEED = 1.0
const SHIFT_SPEED_MULTIPLIER = 2.0

export class Scene {
  canvas: HTMLCanvasElement
  camera: Camera
  cameraControls: Controls
  light: Light
  triangles: Triangle[]
  triangleIndices: number[]
  nodes: Node[]
  nodesUsed: number = 0
  tlasNodesMax: number
  blasIndices: number[]
  blasDescriptions: blasDescription[]
  objectMesh: ObjLoader
  object: Object[]
  blas_consumed: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.objectMesh = new ObjLoader()
    this.object = new Array(9)
    var i: number = 0
    var i: number = 0
    for (let y = -1; y < 2; y++) {
      for (let x = -1; x < 2; x++) {
        this.object[i] = new Object([2 * x, 2 * y, 0], [180, 0, 90])
        i += 1
      }
    }
    this.initialize()
  }

  initialize() {
    this.light = new Light(new Float32Array([1.0, 6.0, 1.0]), new Float32Array([1.0, 1.0, 1.0]), 2.0)
    this.camera = new Camera([-15, 0, -5])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  animateCamera(): void {
    const speed = this.cameraControls.shiftKeyHeld ? DEFAULT_SPEED * SHIFT_SPEED_MULTIPLIER : DEFAULT_SPEED

    // Calculate new forwards direction
    const forwards = vec3.create()
    vec3.cross(forwards, this.camera.right, this.camera.up)
    vec3.normalize(forwards, forwards)

    // Use the calculated forwards vector in the movePlayer method
    this.cameraControls.movePlayer(
      this.cameraControls.forwardsAmount * speed,
      this.cameraControls.rightAmount * speed,
      this.cameraControls.upAmount * speed, // Multiply upAmount by speed if desired
      forwards,
    )

    this.camera.recalculate_vectors()
  }

  async make_scene() {
    await this.objectMesh.initialize([1.0, 1.0, 1.0], "./src/assets/models/statue.obj")
    //await this.objectMesh.initialize([1.0, 1.0, 1.0], "dist/models/ground.obj");

    this.triangles = []
    //console.log("Triangles:")
    this.objectMesh.triangles.forEach((tri) => {
      this.triangles.push(tri)
      //console.log(tri.centroid);
    })

    this.triangleIndices = []
    //console.log("Triangle Indices:")
    this.objectMesh.triangleIndices.forEach((index) => {
      this.triangleIndices.push(index)
      //console.log(index)
    })
    this.tlasNodesMax = 2 * this.object.length - 1
    const blasNodesUsed: number = this.objectMesh.nodesUsed
    this.nodes = new Array(this.tlasNodesMax + blasNodesUsed)
    for (var i: number = 0; i < this.tlasNodesMax + blasNodesUsed; i += 1) {
      this.nodes[i] = new Node()
      this.nodes[i].leftChild = 0
      this.nodes[i].primitiveCount = 0
      this.nodes[i].minCorner = [0, 0, 0]
      this.nodes[i].maxCorner = [0, 0, 0]
    }
    this.buildBVH()
    this.finalizeBVH()
    this.blas_consumed = true
  }

  update(frametime: number) {
    this.object.forEach((statue) => {
      statue.update(frametime / 16.667)
    })

    this.buildBVH()
  }

  buildBVH() {
    const blasNodesUsed: number = this.objectMesh.nodesUsed

    this.nodesUsed = 0

    this.blasDescriptions = new Array(this.object.length)
    this.blasIndices = new Array(this.object.length)
    for (var i: number = 0; i < this.object.length; i++) {
      var description: blasDescription = new blasDescription(this.objectMesh.minCorner, this.objectMesh.maxCorner, this.object[i].model)
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
    for (var i: number = 0; i < this.objectMesh.nodesUsed; i++) {
      var nodeToUpload = this.objectMesh.nodes[i]
      if (nodeToUpload.primitiveCount == 0) {
        //Internal node: leftChild must be shifted
        nodeToUpload.leftChild += this.tlasNodesMax
      }

      //store node
      this.nodes[this.tlasNodesMax + i] = nodeToUpload
    }
  }
}
