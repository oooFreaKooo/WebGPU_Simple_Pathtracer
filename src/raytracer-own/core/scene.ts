import { Camera } from './camera'
import { vec3 } from 'gl-matrix'
import { Controls } from './controls'
import { ObjLoader } from './obj-loader'
import { TLAS } from './bvh/tlas'
import { BLAS } from './bvh/blas'
import { BLASInstance } from './bvh/blas-instance'
import { Material } from './material'
import { ObjectProperties } from '../utils/preset-scenes'

export class Scene {
    // Rendering settings
    enableACES = 1.0
    enableFilmic = 0.0
    enableGammaCorrection = 1.0

    skyMode: number = 0
    enableCulling = 1
    maxBounces = 8
    samples = 1
    jitterScale = 1.0

    // Camera and controls
    camera: Camera = new Camera([ 0.01, 2.5, -7 ])
    cameraControls: Controls

    // Object and material data
    materials: Material[] = []
    private objectMeshes: ObjLoader[] = []
    private materialToIdxMap = new Map<Material, number>()

    // BVH structures
    blasArray: BLAS[] = []
    blasInstanceArray: BLASInstance[] = []
    private uniqueGeometries = new Map<string, BLAS>()
    private totalBLASNodeCount = 0
    private nextMeshID = 0

    // Mapping relationships
    blasTriangleOffsetMap = new Map<string, number>()
    private blasNodeOffsetMap = new Map<string, number>()
    private blasOffsetToMeshIDMap = new Map<number, number>()
    private meshIDToBLAS = new Map<number, BLAS>()

    // Top-Level Acceleration Structure
    tlas!: TLAS

    constructor (canvas: HTMLCanvasElement) {
        this.cameraControls = new Controls(canvas, this.camera)
    }

    async createObjects (objects: ObjectProperties[]) {
        for (const { modelPath, material, position = [ 0, 0, 0 ], scale = [ 1, 1, 1 ], rotation = [ 0, 0, 0 ] } of objects) {

            const objectMesh = await this.loadObjectMesh(modelPath)

            const blas = this.getOrCreateBLAS(modelPath, objectMesh.triangles)

            const meshID = this.nextMeshID++

            this.mapMeshToBLAS(meshID, blas.nodeOffset, blas.blas)

            this.blasOffsetToMeshIDMap.set(blas.nodeOffset, meshID)

            const materialIdx = this.getMaterialIndex(material)

            this.createBLASInstance(position, scale, rotation, blas.nodeOffset, materialIdx)
        }

        // Initialize TLAS after all objects are processed
        this.tlas = new TLAS(this.blasInstanceArray, this.blasOffsetToMeshIDMap, this.meshIDToBLAS)
    }

    private async loadObjectMesh (modelPath: string): Promise<ObjLoader> {

        const objectMesh = new ObjLoader()

        await objectMesh.initialize(modelPath)

        this.objectMeshes.push(objectMesh)

        return objectMesh
    }

    private getMaterialIndex (material: Material): number {

        if (!this.materialToIdxMap.has(material)) {

            this.materials.push(material)

            this.materialToIdxMap.set(material, this.materials.length - 1)
        }
        return this.materialToIdxMap.get(material)!
    }

    private createBLASInstance (
        position: Float32Array | number[],
        scale: Float32Array | number[],
        rotation: Float32Array | number[],
        nodeOffset: number,
        materialIdx: number
    ) {
        this.blasInstanceArray.push(
            new BLASInstance(
                vec3.fromValues(position[0], position[1], position[2]),
                vec3.fromValues(scale[0], scale[1], scale[2]),
                vec3.fromValues(rotation[0], rotation[1], rotation[2]),
                nodeOffset,
                materialIdx
            )
        )
    }

    private getOrCreateBLAS (modelPath: string, triangles: any[]): { blas: BLAS; nodeOffset: number } {
        const existingBLAS = this.uniqueGeometries.get(modelPath)
        if (existingBLAS) {
            const nodeOffset = this.blasNodeOffsetMap.get(existingBLAS.id)!
            return { blas: existingBLAS, nodeOffset }
        }
    
        const blasID = `blas_${this.blasArray.length}`
        const newBLAS = new BLAS(blasID, triangles)
        const nodeOffset = this.totalBLASNodeCount
    
        this.storeBLAS(newBLAS, modelPath, nodeOffset)
    
        return { blas: newBLAS, nodeOffset }
    }
    
    private storeBLAS (blas: BLAS, modelPath: string, nodeOffset: number) {
        this.blasArray.push(blas)
        this.uniqueGeometries.set(modelPath, blas)
        this.blasNodeOffsetMap.set(blas.id, nodeOffset)
        // Ensure both maps are updated if needed
        this.totalBLASNodeCount += blas.m_nodes.length
    }
    

    private mapMeshToBLAS (meshID: number, nodeOffset: number, blas: BLAS) {

        this.blasOffsetToMeshIDMap.set(nodeOffset, meshID)
        this.meshIDToBLAS.set(meshID, blas)
    }
}


