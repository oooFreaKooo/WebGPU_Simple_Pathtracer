import { Camera } from "./camera";
import { vec3, mat4 } from "gl-matrix";
import { Controls } from "./controls";
import { ObjLoader } from "./obj-loader";
import { ObjectProperties } from "../utils/helper";
import { TLAS } from "./bvh/tlas";
import { BLAS } from "./bvh/blas";
import { BLASInstance } from "./bvh/blas-instance";
import { Material } from "./material";

export class Scene {
  cameraControls: Controls;
  canvas: HTMLCanvasElement;
  camera: Camera;
  vignetteStrength: number = 0.5;
  vignetteRadius: number = 0.75;
  enableSkytexture: number = 0;
  enableCulling: number = 1;
  maxBounces: number = 8;
  samples: number = 1;
  jitterScale: number = 1;

  objectMeshes: ObjLoader[] = [];
  tlas: TLAS;
  blasArray: BLAS[] = [];
  blasNodeCount: number; // total node count
  blasInstanceArray: BLASInstance[] = [];
  materials: Material[] = [];

  materialToIdxMap: Map<Material, number> = new Map();
  meshIDtoBlasOffsetMap: Map<number, number> = new Map();
  blasOffsetToMeshIDMap: Map<number, number> = new Map();
  meshIDToBLAS: Map<number, BLAS> = new Map();
  uniqueGeometries: Map<string, BLAS> = new Map();
  blasToNodeOffsetMap: Map<BLAS, number> = new Map();
  totalBLASNodeCount: number = 0;
  nextMeshID: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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
      } = obj

      const objectMesh = new ObjLoader()
      await objectMesh.initialize(modelPath)

      let blas: BLAS
      let blasNodeOffset: number

      // Check if the geometry has already been loaded
      if (this.uniqueGeometries.has(modelPath)) {
        // Use the existing BLAS
        blas = this.uniqueGeometries.get(modelPath)!
        blasNodeOffset = this.blasToNodeOffsetMap.get(blas)!
      } else {
        // Create BLAS for new geometry
        blas = new BLAS(objectMesh.triangles)
        blasNodeOffset = this.totalBLASNodeCount
        this.blasToNodeOffsetMap.set(blas, blasNodeOffset)
        this.totalBLASNodeCount += blas.m_nodes.length
        this.uniqueGeometries.set(modelPath, blas)
        this.blasArray.push(blas)
      }

      // Assign a unique meshID to objectMesh
      const meshID = this.nextMeshID++

      // Map meshID to blasNodeOffset and blasOffset to meshID
      this.meshIDtoBlasOffsetMap.set(meshID, blasNodeOffset)
      this.blasOffsetToMeshIDMap.set(blasNodeOffset, meshID)
      this.meshIDToBLAS.set(meshID, blas)

      // Get material index
      const materialIdx = this.getMaterialIndex(material)

      // Create BLASInstance with position, scale, rotation
      const instance = new BLASInstance(
        vec3.fromValues(position[0], position[1], position[2]),
        vec3.fromValues(scale[0], scale[1], scale[2]),
        vec3.fromValues(rotation[0], rotation[1], rotation[2]),
        blasNodeOffset,
        materialIdx
      )
      this.blasInstanceArray.push(instance)
    }

    // After processing all objects, create the TLAS
    this.tlas = new TLAS(
      this.blasInstanceArray,
      this.blasOffsetToMeshIDMap,
      this.meshIDToBLAS
    )

    console.log('TLAS nodes:', this.tlas.m_tlasNodes)
    console.log('BLAS nodes:', this.blasArray)
    console.log('Instances:', this.blasInstanceArray)
  }

  // Helper method to get material index
  getMaterialIndex(material: Material): number {
    if (!this.materialToIdxMap.has(material)) {
      const idx = this.materials.length;
      this.materials.push(material);
      this.materialToIdxMap.set(material, idx);
      return idx;
    } else {
      return this.materialToIdxMap.get(material)!;
    }
  }
}



