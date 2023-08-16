import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { Light } from "./light"
import { blasDescription } from "./blas_description"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { Node } from "./node"
import { Material } from "./material"

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
  objectMeshes: ObjLoader[] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initialize()
  }

  initialize() {
    this.light = new Light(new Float32Array([150.0, 75.0, 0.0]))

    this.camera = new Camera([0, 5, -15])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  async createObject(modelPath: string, material: Material, position: vec3 = [0, 0, 0], scale: vec3 = [1, 1, 1], rotation: vec3 = [0, 0, 0]) {
    const objectMesh = new ObjLoader(material, position, scale, rotation)
    await objectMesh.initialize(modelPath)

    this.objectMeshes.push(objectMesh)
  }

  prepareBVH() {
    this.triangles = []
    console.log("Triangles:")

    this.objectMeshes.forEach((objectMesh) => {
      objectMesh.triangles.forEach((tri) => {
        this.triangles.push(tri)
        console.log(tri.centroid)
      })
    })

    this.triangleIndices = []
    console.log("Triangle Indices:")

    let triangleIndexOffset = 0 // Initialize the triangle index offset outside the loop

    this.objectMeshes.forEach((objectMesh) => {
      objectMesh.triangleIndices.forEach((index) => {
        const adjustedIndex = index + triangleIndexOffset // Adjust the triangle index
        this.triangleIndices.push(adjustedIndex)
        console.log(adjustedIndex)
      })

      triangleIndexOffset += objectMesh.triangles.length // Update the triangle index offset after processing the objectMesh
    })

    this.tlasNodesMax = 2 * this.objectMeshes.length - 1

    // Calculate the total number of nodes and initialize the this.nodes array
    const totalNodes = this.tlasNodesMax + this.objectMeshes.reduce((acc, objectMesh) => acc + objectMesh.nodesUsed, 0)
    this.nodes = new Array(totalNodes).fill(null).map(() => new Node())

    let nodeOffset = 0 // Initialize the node offset outside the loop

    this.objectMeshes.forEach((objectMesh) => {
      const blasNodesUsed: number = objectMesh.nodesUsed

      for (var i: number = 0; i < blasNodesUsed; i += 1) {
        const adjustedNodeIndex = nodeOffset + i // Adjust the node index
        this.nodes[adjustedNodeIndex].leftChild = 0
        this.nodes[adjustedNodeIndex].primitiveCount = 0
        this.nodes[adjustedNodeIndex].minCorner = [0, 0, 0]
        this.nodes[adjustedNodeIndex].maxCorner = [0, 0, 0]
        console.log("Reading node %d", adjustedNodeIndex)
      }

      nodeOffset += blasNodesUsed // Update the node offset after processing the objectMesh
    })
  }

  buildBVH() {
    this.nodesUsed = 0

    this.blasDescriptions = new Array(this.objectMeshes.length)
    this.blasIndices = new Array(this.objectMeshes.length)

    for (var i: number = 0; i < this.objectMeshes.length; i++) {
      var description: blasDescription = new blasDescription(
        this.objectMeshes[i].minCorner,
        this.objectMeshes[i].maxCorner,
        this.objectMeshes[i].model,
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
    this.objectMeshes.forEach((objectMesh) => {
      for (var i: number = 0; i < objectMesh.nodesUsed; i++) {
        var nodeToUpload = objectMesh.nodes[i]
        if (nodeToUpload.primitiveCount == 0) {
          //Internal node: leftChild must be shifted
          nodeToUpload.leftChild += this.tlasNodesMax
        }

        //store node
        this.nodes[this.tlasNodesMax + i] = nodeToUpload
      }
    })
  }

  update(frametime: number) {
    //this.buildBVH()
  }
}
