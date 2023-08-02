import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { Light } from "./light"

const DEFAULT_SPEED = 1.0
const SHIFT_SPEED_MULTIPLIER = 2.0

export class Scene {
  canvas: HTMLCanvasElement
  camera: Camera
  cameraControls: Controls
  light: Light

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initialize()
  }

  initialize() {
    this.setupCamera()
    this.light = new Light(new Float32Array([1.0, 6.0, 1.0]), new Float32Array([1.0, 1.0, 1.0]), 2.0)
  }

  private setupCamera(): void {
    this.camera = new Camera([5, 0, 5])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  public update(): void {
    this.animateCamera()
  }

  animateCamera(): void {
    const speed = this.cameraControls.shiftKeyHeld ? DEFAULT_SPEED * SHIFT_SPEED_MULTIPLIER : DEFAULT_SPEED
    const forwards = vec3.create()
    vec3.cross(forwards, this.camera.right, this.camera.up)
    vec3.normalize(forwards, forwards)
    this.cameraControls.movePlayer(
      this.cameraControls.forwardsAmount * speed,
      this.cameraControls.rightAmount * speed,
      this.cameraControls.upAmount,
      forwards,
    )
    this.camera.recalculateVectors()
  }

  /*
  public async buildScene(): Promise<void> {
    this.triangles = ([] as Triangle[]).concat(...this.objectMeshes.map((mesh) => mesh.triangles))
    this.triangleIndices = ([] as number[]).concat(...this.objectMeshes.map((mesh) => mesh.triangleIndices))

    const totalNodesUsed = this.objectMeshes.reduce((acc, mesh) => acc + mesh.nodesUsed, 0)
    this.nodesUsed = totalNodesUsed
    this.tlasNodesMax = 2 * this.objects.length - 1

    this.nodes = Array.from({ length: this.tlasNodesMax }, () => {
      const node = new Node()
      node.leftChild = 0
      node.primitiveCount = 0
      node.minCorner = [0, 0, 0]
      node.maxCorner = [0, 0, 0]
      return node
    })

    this.buildBVH()
    this.finalizeBVH()
    this.blasConsumed = true
  }

buildBVH() {
    this.nodesUsed = 0
    if (this.objects.length !== this.objectMeshes.length) {
      throw new Error("Mismatch between objects and their meshes.")
    }

    this.blasDescriptions = new Array(this.objects.length)
    this.blasIndices = new Array(this.objects.length)

    for (let i = 0; i < this.objects.length; i++) {
      const description = new blasDescription(this.objectMeshes[i].minCorner, this.objectMeshes[i].maxCorner, this.objects[i].model)

      description.rootNodeIndex = this.tlasNodesMax
      this.blasDescriptions[i] = description
      this.blasIndices[i] = i
    }

    this.resetNodes()
    this.setRootNode()
    this.updateBounds(0)
    this.subdivide(0)
  }

  private resetNodes() {
    for (let i = 0; i < this.tlasNodesMax; i++) {
      this.nodes[i].leftChild = 0
      this.nodes[i].primitiveCount = 0
      this.nodes[i].minCorner = [0, 0, 0]
      this.nodes[i].maxCorner = [0, 0, 0]
    }
  }

  private setRootNode() {
    const root = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = this.blasDescriptions.length
    this.nodesUsed += 1
  }

  updateBounds(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    node.minCorner = [MAX_VALUE, MAX_VALUE, MAX_VALUE]
    node.maxCorner = [MIN_VALUE, MIN_VALUE, MIN_VALUE]
    for (let i = 0; i < node.primitiveCount; i++) {
      const description = this.blasDescriptions[this.blasIndices[node.leftChild + i]]
      vec3.min(node.minCorner, node.minCorner, description.minCorner)
      vec3.max(node.maxCorner, node.maxCorner, description.maxCorner)
    }
  }

  subdivide(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    if (node.primitiveCount < 2) return
    const extent = vec3.subtract(vec3.create(), node.maxCorner, node.minCorner)
    const axis = this.getSplitAxis(extent)
    const splitPosition = node.minCorner[axis] + extent[axis] / 2
    this.partitionBlasDescriptions(node, splitPosition, axis)
  }

  private getSplitAxis(extent: vec3): number {
    let axis = 0
    if (extent[1] > extent[axis]) axis = 1
    if (extent[2] > extent[axis]) axis = 2
    return axis
  }

  private partitionBlasDescriptions(node: Node, splitPosition: number, axis: number) {
    let i = node.leftChild
    let j = i + node.primitiveCount - 1
    while (i <= j) {
      if (this.blasDescriptions[this.blasIndices[i]].center[axis] < splitPosition) {
        i++
      } else {
        const temp = this.blasIndices[i]
        this.blasIndices[i] = this.blasIndices[j]
        this.blasIndices[j] = temp
        j--
      }
    }
    this.createChildNodes(node, i)
  }

  private createChildNodes(node: Node, splitIndex: number) {
    const leftCount = splitIndex - node.leftChild
    if (leftCount === 0 || leftCount === node.primitiveCount) return
    const leftChildIndex = this.nodesUsed++
    const rightChildIndex = this.nodesUsed++
    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = leftCount
    this.nodes[rightChildIndex].leftChild = splitIndex
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount
    node.leftChild = leftChildIndex
    node.primitiveCount = 0
    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }

  finalizeBVH() {
    let offset = 0

    for (const object_mesh of this.objectMeshes) {
      for (let i = 0; i < object_mesh.nodesUsed; i++) {
        const nodeToUpload = object_mesh.nodes[i]
        if (nodeToUpload.primitiveCount === 0) {
          nodeToUpload.leftChild += this.tlasNodesMax
        }
        this.nodes[this.tlasNodesMax + offset + i] = nodeToUpload
      }
      offset += object_mesh.nodesUsed
    }
  } */
}
