import { mat4, vec3 } from "gl-matrix";
import { BLAS } from "./blas";
import { BLASInstance } from "./blas-instance";
import { AABB } from "../node";

/**
 * Represents a node in the Top-Level Acceleration Structure (TLAS).
 */
export interface TLASNode {
    aabb: AABB;
    left: number;
    right: number;
    blas: number; // Index of the BLAS instance
}

/**
 * Top-Level Acceleration Structure for organizing BLAS instances.
 */
export class TLAS {
    m_tlasNodes: TLASNode[];
    m_offsetToMeshId: Map<number, number>;
    m_nodeUsed: number;
    m_blasInstances: BLASInstance[];
    m_meshIDtoBLAS: Map<number, BLAS>;
    constructor(
        blasInstances: BLASInstance[],
        blasOffsetToMeshId: Map<number, number>,
        meshIDToBLAS: Map<number, BLAS>
    ) {
        this.m_blasInstances = blasInstances;
        this.m_tlasNodes = new Array<TLASNode>(blasInstances.length * 2);
        this.m_nodeUsed = 1; // Start at 1 to keep root node empty
        this.m_offsetToMeshId = blasOffsetToMeshId;
        this.m_meshIDtoBLAS = meshIDToBLAS;
        this._build();
    }

    /**
     * Builds the TLAS by organizing BLAS instances into a hierarchy.
     */
    private _build(): void {
        var numInstances = this.m_blasInstances.length;
        const nodeIndices = new Uint32Array(numInstances);

        // Initialize TLAS nodes with BLAS instances
        for (let i = 0; i < numInstances; i++) {
            nodeIndices[i] = this.m_nodeUsed;

            const blasInstance = this.m_blasInstances[i];
            const meshID = this.m_offsetToMeshId.get(blasInstance.blasOffset);
            if (meshID === undefined) {
                throw new Error(`Mesh ID not found for BLAS offset: ${blasInstance.blasOffset}`);
            }

            const blas = this.m_meshIDtoBLAS.get(meshID);
            if (blas === undefined) {
                throw new Error(`BLAS not found for Mesh ID: ${meshID}`);
            }

            // Clone and transform the BLAS's AABB
            const blasAABB = blas.m_nodes[0].aabb.clone();
            blasAABB.applyMatrix4(mat4.clone(blasInstance.transform));

            // Create a TLASNode for this BLAS instance
            const tlasNode: TLASNode = {
                aabb: blasAABB,
                left: 0,
                right: 0,
                blas: i,
            };

            this.m_tlasNodes[this.m_nodeUsed++] = tlasNode;
        }

        // Start building the hierarchy by finding best matches to merge
        let A = 0;
        let B = this._findBestMatch(nodeIndices, numInstances, A);

        while (numInstances > 1) {
            const C = this._findBestMatch(nodeIndices, numInstances, B);

            if (A === C) {
                // Merge nodes A and B
                const aabbA = this.m_tlasNodes[nodeIndices[A]].aabb;
                const aabbB = this.m_tlasNodes[nodeIndices[B]].aabb;
                const newAABB = aabbA.union(aabbB);

                // Create a new parent node for A and B
                const newNode: TLASNode = {
                    aabb: newAABB,
                    left: nodeIndices[A],
                    right: nodeIndices[B],
                    blas: 0, // Internal nodes do not hold a BLAS
                };

                // Assign the new node and update nodeIndices
                this.m_tlasNodes[this.m_nodeUsed] = newNode;
                nodeIndices[A] = this.m_nodeUsed++;
                nodeIndices[B] = nodeIndices[--numInstances];
                B = this._findBestMatch(nodeIndices, numInstances, A);
            } else {
                // Move to the next node
                A = B;
                B = C;
            }
        }

        // Set the root node of the TLAS
        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIndices[A]];
    }

    private _findBestMatch(nodeIndices: Uint32Array, count: number, A: number): number {
        let smallestArea = Infinity;
        let bestB = -1;

        const aabbA = this.m_tlasNodes[nodeIndices[A]].aabb;

        for (let B = 0; B < count; B++) {
            if (A === B) continue;

            const aabbB = this.m_tlasNodes[nodeIndices[B]].aabb;

            // Compute the combined AABB of A and B
            const combinedMax = vec3.create();
            vec3.max(combinedMax, aabbA.bmax, aabbB.bmax);

            const combinedMin = vec3.create();
            vec3.min(combinedMin, aabbA.bmin, aabbB.bmin);

            const extent = vec3.create();
            vec3.sub(extent, combinedMax, combinedMin);

            // Calculate surface area as a simple metric
            const surfaceArea = extent[0] * extent[1] + extent[1] * extent[2] + extent[2] * extent[0];

            // Update the best match if this surface area is smaller
            if (surfaceArea < smallestArea) {
                smallestArea = surfaceArea;
                bestB = B;
            }
        }

        return bestB;
    }
}
