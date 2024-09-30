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
        let nodeIndices = this.m_blasInstances.length;
        let nodeIdx: Uint32Array = new Uint32Array(nodeIndices);

        // Initialize TLAS nodes with BLAS instances
        for (let i = 0; i < this.m_blasInstances.length; ++i) {
            nodeIdx[i] = this.m_nodeUsed;
            const meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset);
            if (meshID === undefined) throw new Error("Mesh ID not found");

            const blas = this.m_meshIDtoBLAS.get(meshID);
            if (blas === undefined) throw new Error("BLAS not found");

            // Clone and transform the BLAS's AABB
            const blasAABB = blas.m_nodes[0].aabb.clone();
            const transform = this.m_blasInstances[i].transform;
            blasAABB.applyMatrix4(transform);

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
        let B = this._findBestMatch(nodeIdx, nodeIndices, A);

        while (nodeIndices > 1) {
            let C = this._findBestMatch(nodeIdx, nodeIndices, B);

            if (A === C) {
                // Combine the two nodes into a new parent node
                const newNode: TLASNode = {
                    aabb: this.m_tlasNodes[nodeIdx[A]].aabb.clone().union(this.m_tlasNodes[nodeIdx[B]].aabb),
                    left: nodeIdx[A],
                    right: nodeIdx[B],
                    blas: 0, // No BLAS for internal nodes
                };

                this.m_tlasNodes[this.m_nodeUsed] = newNode;
                nodeIdx[A] = this.m_nodeUsed++;
                nodeIdx[B] = nodeIdx[--nodeIndices]; // Move the last node to replace the merged node
                B = this._findBestMatch(nodeIdx, nodeIndices, A);
            } else {
                // Advance A and B
                A = B;
                B = C;
            }
        }

        // Set the root node of the TLAS
        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIdx[A]];
    }


    private _findBestMatch(nodeIndices: Uint32Array, count: number, A: number): number {
        let smallestArea = Infinity;
        let bestB = -1;

        const aabbA = this.m_tlasNodes[nodeIndices[A]].aabb;

        for (let B = 0; B < count; B++) {
            if (A === B) continue;

            const aabbB = this.m_tlasNodes[nodeIndices[B]].aabb;

            // Compute the combined AABB of A and B
            const combinedMin = vec3.min(vec3.create(), aabbA.bmin, aabbB.bmin);
            const combinedMax = vec3.max(vec3.create(), aabbA.bmax, aabbB.bmax);

            const extent = vec3.sub(vec3.create(), combinedMax, combinedMin);

            // Calculate surface area using the extent of the combined AABB
            const surfaceArea = 2 * (extent[0] * extent[1] + extent[1] * extent[2] + extent[2] * extent[0]);

            // Update the best match if this surface area is smaller
            if (surfaceArea < smallestArea) {
                smallestArea = surfaceArea;
                bestB = B;
            }
        }

        return bestB;
    }

}
