import { vec3 } from 'gl-matrix'
import { BLAS } from './blas'
import { BLASInstance } from './blas-instance'
import { AABB } from '../node'


export interface TLASNode {
    aabb: AABB;
    left: number;
    right: number;
    blas: number; // Index of the BLAS instance
}

export class TLAS {
    m_tlasNodes: TLASNode[]
    m_offsetToMeshId: Map<number, number>
    m_nodeUsed: number
    m_blasInstances: BLASInstance[]
    m_meshIDtoBLAS: Map<number, BLAS>
    constructor (
        blasInstances: BLASInstance[],
        blasOffsetToMeshId: Map<number, number>,
        meshIDToBLAS: Map<number, BLAS>
    ) {
        this.m_blasInstances = blasInstances
        this.m_tlasNodes = new Array<TLASNode>(blasInstances.length * 2)
        this.m_nodeUsed = 1 // Start at 1 to keep root node empty
        this.m_offsetToMeshId = blasOffsetToMeshId
        this.m_meshIDtoBLAS = meshIDToBLAS
        this._build()
    }

    private _build (): void {
        // Initialize TLAS nodes with BLAS instances
        for (let i = 0; i < this.m_blasInstances.length; ++i) {
            const meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset)
            if (meshID === undefined) { throw new Error('Mesh ID not found') }

            const blas = this.m_meshIDtoBLAS.get(meshID)
            if (blas === undefined) { throw new Error('BLAS not found') }

            // Clone and transform the BLAS's AABB
            const blasAABB = blas.m_nodes[0].aabb.clone()
            const transform = this.m_blasInstances[i].transform
            blasAABB.applyMatrix4(transform)

            // Create a TLASNode for this BLAS instance
            const tlasNode: TLASNode = {
                aabb: blasAABB,
                left: 0,
                right: 0,
                blas: i, // Leaf node references the BLAS index
            }

            this.m_tlasNodes[this.m_nodeUsed++] = tlasNode
        }

        const leafIndices = Array.from({ length: this.m_blasInstances.length }, (_, i) => i + 1)

        const rootIdx = this._buildRecursiveWithSAH(leafIndices)

        // Set the root node of the TLAS
        this.m_tlasNodes[0] = this.m_tlasNodes[rootIdx]
    }
    
    private _findBestSplit (indices: number[]): { axis: number; splitIndex: number } {
        let bestAxis = -1
        let bestSplit = -1
        let minCost = Infinity
    
        for (let axis = 0; axis < 3; axis++) {
            // Sort indices based on centroid along the current axis
            indices.sort((a, b) => {
                const centroidA = vec3.scale(vec3.create(), vec3.add(vec3.create(), this.m_tlasNodes[a].aabb.bmin, this.m_tlasNodes[a].aabb.bmax), 0.5)[axis]
                const centroidB = vec3.scale(vec3.create(), vec3.add(vec3.create(), this.m_tlasNodes[b].aabb.bmin, this.m_tlasNodes[b].aabb.bmax), 0.5)[axis]
                return centroidA - centroidB
            })
    
            for (let i = 1; i < indices.length; i++) {
                const left = indices.slice(0, i)
                const right = indices.slice(i)
    
                // Compute bounding boxes for left and right subsets
                let leftAABB = this.m_tlasNodes[left[0]].aabb.clone()
                for (let j = 1; j < left.length; j++) {
                    leftAABB = this._combineAABB(leftAABB, this.m_tlasNodes[left[j]].aabb)
                }
    
                let rightAABB = this.m_tlasNodes[right[0]].aabb.clone()
                for (let j = 1; j < right.length; j++) {
                    rightAABB = this._combineAABB(rightAABB, this.m_tlasNodes[right[j]].aabb)
                }
    
                const cost = this._computeSurfaceArea(leftAABB) + this._computeSurfaceArea(rightAABB)
    
                if (cost < minCost) {
                    minCost = cost
                    bestAxis = axis
                    bestSplit = i
                }
            }
        }
    
        return { axis: bestAxis, splitIndex: bestSplit }
    }
    
    private _buildRecursiveWithSAH (indices: number[]): number {
        if (indices.length === 1) {
            return indices[0]
        }
    
        // Find the best split using SAH
        const { axis, splitIndex } = this._findBestSplit(indices)
    
        let leftIndices: number[]
        let rightIndices: number[]
    
        if (axis === -1 || splitIndex === -1) {
            // Fallback to median split if no good split is found
            const mid = Math.floor(indices.length / 2)
            leftIndices = indices.slice(0, mid)
            rightIndices = indices.slice(mid)
        } else {
            leftIndices = indices.slice(0, splitIndex)
            rightIndices = indices.slice(splitIndex)
        }
    
        // Recursively build child nodes
        const leftChild = this._buildRecursiveWithSAH(leftIndices)
        const rightChild = this._buildRecursiveWithSAH(rightIndices)
    
        // Create a new internal node
        const leftAABB = this.m_tlasNodes[leftChild].aabb
        const rightAABB = this.m_tlasNodes[rightChild].aabb
        const parentAABB = this._combineAABB(leftAABB, rightAABB)
    
        const parentNode: TLASNode = {
            aabb: parentAABB,
            left: leftChild,
            right: rightChild,
            blas: 0, // Internal nodes do not reference a BLAS
        }
    
        this.m_tlasNodes[this.m_nodeUsed] = parentNode
        const parentIdx = this.m_nodeUsed++
        return parentIdx
    }
    
    private _computeSurfaceArea (aabb: AABB): number {
        const extent = vec3.sub(vec3.create(), aabb.bmax, aabb.bmin)
        return 2 * (extent[0] * extent[1] + extent[1] * extent[2] + extent[2] * extent[0])
    }
    
    private _combineAABB (aabb1: AABB, aabb2: AABB): AABB {
        const combined = new AABB()
        combined.bmin = vec3.min(vec3.create(), aabb1.bmin, aabb2.bmin)
        combined.bmax = vec3.max(vec3.create(), aabb1.bmax, aabb2.bmax)
        return combined
    }
}
