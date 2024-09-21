import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { Triangle } from "./triangle"
import { AABB, Bin, Node } from "./node"
import { ObjectProperties } from "../utils/helper"

const MAX_VALUE = Number.POSITIVE_INFINITY
const MIN_VALUE = Number.NEGATIVE_INFINITY

export class Scene {
  private cameraControls: Controls
  private canvas: HTMLCanvasElement
  private objectIDCount: number = 0 // starting at 0
  objectMeshes: ObjLoader[] = []
  camera: Camera
  vignetteStrength: number = 0.5
  vignetteRadius: number = 0.75

  // Data for the BVH
  nodes: Node[]
  nodesUsed: number = 0
  triangleIndices: number[]
  triangles: Triangle[]
  enableSkytexture: number = 0
  enableCulling: number = 1
  maxBounces: number = 8
  samples: number = 1
  jitterScale: number = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initialize()
  }

  // scene settings
  private initialize() {
    this.camera = new Camera([0.01, 2.5, -7])
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  // creates objects using the ObjLoader
  async createObjects(objects: ObjectProperties[]) {
    for (const obj of objects) {
      const { modelPath, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0] } = obj

      // settings for the new object
      const objectMesh = new ObjLoader(material, position, scale, rotation, this.objectIDCount)
      // create the object
      await objectMesh.initialize(modelPath)

      // push the object into an array
      this.objectMeshes.push(objectMesh)

      // make sure next object gets a new ID
      this.objectIDCount++
    }
  }

  async prepareBVH() {
    this.triangles = []

    // gather all triangles from all objects
    this.objectMeshes.forEach((objectMesh) => {
      objectMesh.triangles.forEach((triangle) => {
        this.triangles.push(triangle)
      })
    })

    // set an index for each triangle
    this.triangleIndices = new Array(this.triangles.length)
    for (var i: number = 0; i < this.triangles.length; i += 1) {
      this.triangleIndices[i] = i
    }

    // create empty nodes. 2*n-1 for a binary tree
    this.nodes = new Array(2 * this.triangles.length - 1)
    for (var i: number = 0; i < 2 * this.triangles.length - 1; i += 1) {
      this.nodes[i] = new Node()
    }

    // build the BVH
    this.buildBVH()
  }

  private buildBVH() {
    // measures how long it took to build
    console.time("Subdivision Time")

    // our root node contains all the triangles at first
    var root = this.nodes[0]
    root.leftFirst = 0
    root.triCount = this.triangles.length
    this.nodesUsed = 1

    this.updateNodeBounds(0)
    this.subdivide(0)

    console.timeEnd("Subdivision Time")
  }

  private updateNodeBounds(nodeIndex: number) {
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

  // https://jacco.ompf2.com/2022/04/18/how-to-build-a-bvh-part-2-faster-rays/
  // Recursively subdivide a node to optimize ray-triangle intersection tests
  private subdivide(nodeIdx: number): void {
    const node = this.nodes[nodeIdx]
    if (node.triCount <= 2) return
    // Determine the optimal plane to split the node triangles, aiming to minimize ray intersection tests
    const { bestAxis, bestPos, bestCost } = this.findBestSplitPlane(node)

    // If subdividing doesnt improve ray intersection performance, stop further subdivision
    if (bestCost >= this.calculateNodeCost(node)) return

    let i = node.leftFirst
    let j = i + node.triCount - 1

    // Organize triangles based on their spatial location relative to the optimal split plane
    // This helps in quickly discarding irrelevant triangles during ray intersection tests
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

    // If all triangles end up on one side, its not beneficial to subdivide further
    if (leftCount === 0 || leftCount === node.triCount) return

    // Create child nodes to further refine the spatial hierarchy
    const leftChildIdx = this.nodesUsed++
    const rightChildIdx = this.nodesUsed++

    this.nodes[leftChildIdx].leftFirst = node.leftFirst
    this.nodes[leftChildIdx].triCount = leftCount
    this.nodes[rightChildIdx].leftFirst = i
    this.nodes[rightChildIdx].triCount = node.triCount - leftCount

    // Update the current node to reference its children
    node.leftFirst = leftChildIdx
    node.triCount = 0

    // Update bounding boxes for child nodes, which are used to quickly discard nodes during ray intersection tests
    this.updateNodeBounds(leftChildIdx)
    this.updateNodeBounds(rightChildIdx)

    // Continue the subdivision process for the child nodes
    this.subdivide(leftChildIdx)
    this.subdivide(rightChildIdx)
  }

  // This function determines the best split plane for a given node in a spatial data structure
  // The goal is to find an optimal axis and position to split the nodes triangles, minimizing the cost
  private findBestSplitPlane(node: Node): { bestAxis: number; bestPos: number; bestCost: number } {
    // Dynamic binning based on the number of triangles
    const BINS = Math.ceil(Math.sqrt(node.triCount))

    let bestCost = Infinity
    let bestAxis = -1
    let bestPos = 0

    // Iterate over the three axes
    for (let a = 0; a < 3; a++) {
      let boundsMin = Infinity
      let boundsMax = -Infinity

      // Calculate the bounding box for the triangles in the node along the current axis
      for (let i = 0; i < node.triCount; i++) {
        const triangle = this.triangles[this.triangleIndices[node.leftFirst + i]]
        boundsMin = Math.min(boundsMin, triangle.centroid[a])
        boundsMax = Math.max(boundsMax, triangle.centroid[a])
      }

      // If all triangles have the same centroid on this axis, skip to the next axis
      if (boundsMin == boundsMax) continue

      // Initialize bins for spatial partitioning
      const bin: Bin[] = Array(BINS)
        .fill(null)
        .map(() => new Bin())
      const scale = BINS / (boundsMax - boundsMin)

      // Assign triangles to bins based on their centroids
      for (let i = 0; i < node.triCount; i++) {
        const triangle = this.triangles[this.triangleIndices[node.leftFirst + i]]
        const binIdx = Math.min(BINS - 1, Math.floor((triangle.centroid[a] - boundsMin) * scale))
        bin[binIdx].triCount++
        triangle.corners.forEach((corner) => bin[binIdx].bounds.grow(corner))
      }

      // Initialize arrays to store areas and counts of triangles to the left and right of each bin boundary
      const leftArea = new Array(BINS - 1).fill(0)
      const rightArea = new Array(BINS - 1).fill(0)
      const leftCount = new Array(BINS - 1).fill(0)
      const rightCount = new Array(BINS - 1).fill(0)
      let leftBox = new AABB()
      let rightBox = new AABB()
      let leftSum = 0,
        rightSum = 0

      // Calculate areas and counts for each bin boundary
      for (let i = 0; i < BINS - 1; i++) {
        leftSum += bin[i].triCount
        leftCount[i] = leftSum
        leftBox.growByAABB(bin[i].bounds)
        leftArea[i] = leftBox.area()
        rightSum += bin[BINS - 1 - i].triCount
        rightCount[BINS - 2 - i] = rightSum
        rightBox.growByAABB(bin[BINS - 1 - i].bounds)
        rightArea[BINS - 2 - i] = rightBox.area()
      }

      const scale2 = (boundsMax - boundsMin) / BINS

      // Calculate the cost for each bin boundary and update the best split if a lower cost is found
      for (let i = 0; i < BINS - 1; i++) {
        const planeCost = leftCount[i] * leftArea[i] + rightCount[i] * rightArea[i]
        if (planeCost < bestCost) {
          bestCost = planeCost
          bestAxis = a
          bestPos = boundsMin + scale2 * (i + 1)
        }
      }
    }

    return { bestAxis, bestPos, bestCost }
  }

  private calculateNodeCost(node: Node): number {
    const e = vec3.subtract(vec3.create(), node.aabbMax, node.aabbMin)
    const surfaceArea = e[0] * e[1] + e[1] * e[2] + e[2] * e[0]
    return node.triCount * surfaceArea
  }
}

// WITHOUT BINNING
/* subdivide2(nodeIdx: number): void {
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

  if (bestCost >= this.calculateNodeCost(node)) return

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
} */
