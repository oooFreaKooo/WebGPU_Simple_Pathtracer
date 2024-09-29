import { Camera } from "./camera";
import { vec3 } from "gl-matrix";
import { Controls } from "./controls";
import { ObjLoader } from "./obj-loader";
import { ObjectProperties } from "../utils/helper";
import { TLAS } from "./bvh/tlas";
import { BLAS } from "./bvh/blas";
import { BLASInstance } from "./bvh/blas-instance";
import { Material } from "./material";

export class Scene {
  // Rendering settings
  vignetteStrength = 0.5;
  vignetteRadius = 0.75;
  enableSkytexture = 0;
  enableCulling = 1;
  maxBounces = 8;
  samples = 1;
  jitterScale = 1;

  // Camera and controls
  camera: Camera = new Camera([0.01, 2.5, -7]);
  cameraControls: Controls;

  // Canvas element
  constructor(canvas: HTMLCanvasElement) {
    this.cameraControls = new Controls(canvas, this.camera);
  }

  // Object and material data
  materials: Material[] = [];
  private objectMeshes: ObjLoader[] = [];
  private materialToIdxMap = new Map<Material, number>();

  // BVH structures
  blasArray: BLAS[] = [];
  blasInstanceArray: BLASInstance[] = [];
  private uniqueGeometries = new Map<string, BLAS>();
  private totalBLASNodeCount = 0;
  private nextMeshID = 0;

  // Mapping relationships
  blasTriangleIndexOffsets = new Map<string, number>();
  private blasToNodeOffsetMap = new Map<string, number>();
  private blasOffsetToMeshIDMap = new Map<number, number>();
  private meshIDtoBlasOffsetMap = new Map<number, number>();
  private meshIDToBLAS = new Map<number, BLAS>();

  // Top-Level Acceleration Structure
  tlas!: TLAS;

  async createObjects(objects: ObjectProperties[]) {
    for (const { modelPath, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0] } of objects) {
      const objectMesh = new ObjLoader();
      await objectMesh.initialize(modelPath);
      this.objectMeshes.push(objectMesh);

      const blas = this.getOrCreateBLAS(modelPath, objectMesh.triangles);

      const meshID = this.nextMeshID++;
      this.mapMeshToBLAS(meshID, blas.nodeOffset, blas.blas);

      const materialIdx = this.getMaterialIndex(material);

      this.blasInstanceArray.push(
        new BLASInstance(
          vec3.fromValues(position[0], position[1], position[2]),
          vec3.fromValues(scale[0], scale[1], scale[2]),
          vec3.fromValues(rotation[0], rotation[1], rotation[2]),
          blas.nodeOffset,
          materialIdx
        )
      );

    }

    // Initialize TLAS after all objects are processed
    this.tlas = new TLAS(this.blasInstanceArray, this.blasOffsetToMeshIDMap, this.meshIDToBLAS);
  }

  private getMaterialIndex(material: Material): number {
    if (!this.materialToIdxMap.has(material)) {
      this.materials.push(material);
      this.materialToIdxMap.set(material, this.materials.length - 1);
    }
    return this.materialToIdxMap.get(material)!;
  }

  private getOrCreateBLAS(modelPath: string, triangles: any[]): { blas: BLAS; nodeOffset: number } {
    const existingBLAS = this.uniqueGeometries.get(modelPath);
    if (existingBLAS) {
      const nodeOffset = this.blasToNodeOffsetMap.get(existingBLAS.id)!;
      return { blas: existingBLAS, nodeOffset };
    }

    const blasID = `blas_${this.blasArray.length}`;
    const newBLAS = new BLAS(blasID, triangles);
    const nodeOffset = this.totalBLASNodeCount;

    this.blasArray.push(newBLAS);
    this.uniqueGeometries.set(modelPath, newBLAS);
    this.blasToNodeOffsetMap.set(blasID, nodeOffset);
    this.blasTriangleIndexOffsets.set(blasID, nodeOffset);
    this.totalBLASNodeCount += newBLAS.m_nodes.length;

    return { blas: newBLAS, nodeOffset };
  }

  private mapMeshToBLAS(meshID: number, nodeOffset: number, blas: BLAS) {
    this.meshIDtoBlasOffsetMap.set(meshID, nodeOffset);
    this.blasOffsetToMeshIDMap.set(nodeOffset, meshID);
    this.meshIDToBLAS.set(meshID, blas);
  }
}

