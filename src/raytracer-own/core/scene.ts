import { Camera } from "./camera"
import { vec3 } from "gl-matrix"
import { Controls } from "./controls"
import { ObjLoader } from "./obj-loader"
import { ObjectProperties } from "../utils/helper"
import { BVHInstance, TLAS } from "./bvh/tlas"
import { BLAS } from "./bvh/blas"


export class Scene {
  private cameraControls: Controls;
  private canvas: HTMLCanvasElement;
  private objectIDCount: number = 0; // starting at 0
  objectMeshes: ObjLoader[] = [];
  camera: Camera;
  vignetteStrength: number = 0.5;
  vignetteRadius: number = 0.75;

  // Data for the BVH and TLAS

  enableSkytexture: number = 0;
  enableCulling: number = 1;
  maxBounces: number = 8;
  samples: number = 1;
  jitterScale: number = 1;

  // New properties for TLAS
  uniqueGeometries: Map<string, BLAS> = new Map();
  blasInstances: BVHInstance[] = [];
  tlas: TLAS;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initialize();
  }

  // scene settings
  private initialize() {
    this.camera = new Camera([0.01, 2.5, -7]);
    this.cameraControls = new Controls(this.canvas, this.camera);
  }


  // creates objects using the ObjLoader
  async createObjects(objects: ObjectProperties[]) {
    for (const obj of objects) {
      const {
        modelPath,
        material,
        position = [0, 0, 0],
        scale = [1, 1, 1],
        rotation = [0, 0, 0],
      } = obj;

      // settings for the new object
      const objectMesh = new ObjLoader(
        material,
        position as vec3,
        scale as vec3,
        rotation as vec3,
        this.objectIDCount
      );
      var blas: BLAS
      // Check if the geometry has already been loaded
      if (this.uniqueGeometries.has(modelPath)) {
        // Use the existing BLAS
        blas = this.uniqueGeometries.get(modelPath)!;
      } else {
        // Load the geometry and create BLAS
        await objectMesh.initialize(modelPath);

        // Build BLAS for this geometry
        blas = await this.buildBLAS(objectMesh);

        // Store the BLAS for future instances
        this.uniqueGeometries.set(modelPath, blas);
      }

      // push the object into an array
      this.objectMeshes.push(objectMesh);

      // Create a BVHInstance for the object
      const instance = new BVHInstance(blas, objectMesh.model);

      // Store the instance
      this.blasInstances.push(instance);

      // make sure next object gets a new ID
      this.objectIDCount++;
    }
  }

  // Method to build BLAS from ObjLoader
  async buildBLAS(objectMesh: ObjLoader): Promise<BLAS> {
    // Build the BVH for the object's triangles
    const blas = new BLAS(objectMesh.triangles);
    await blas.buildBVH();
    return blas;
  }

  // Build the TLAS after all objects have been created
  async buildTLAS() {
    // Create the TLAS using the list of BVHInstances
    this.tlas = new TLAS(this.blasInstances, this.blasInstances.length);

    // Build the TLAS
    await this.tlas.Build();
    console.log('TLAS nodes:', this.tlas.blas)
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
