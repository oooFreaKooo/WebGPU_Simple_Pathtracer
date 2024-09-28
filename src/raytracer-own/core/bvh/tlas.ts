import { mat4, vec3 } from "gl-matrix";
import { BLAS } from "./blas";
import { BLASInstance } from "./blas-instance";
import { AABB } from "../node";

const TLAS_NODE_SIZE: number =
    12 +     // aabb min (vec3<f32>)
    4 +     // left (u32, part of aabbMin array)
    12 +     // aabb max (vec3<f32>)
    4 +     // right (u32, part of aabbMax array)
    4 +     // blas (u32, instanceIdx)
    12;       // padding
// = 48 bytes

interface TLASNode {
    aabb: AABB;
    left: number;
    right: number;
    blas: number; // Instance index which holds blas information
};

export class TLAS {

    m_tlasNodes: Array<TLASNode>;
    m_offsetToMeshId: Map<number, number>;
    m_nodeUsed: number;
    m_blasInstances: Array<BLASInstance>;
    m_meshIDtoBLAS: Map<number, BLAS>;

    constructor(
        blasInstances: Array<BLASInstance>,
        blasOffsetToMeshId: Map<number, number>,
        meshIDToBLAS: Map<number, BLAS>
    ) {
        this.m_blasInstances = blasInstances;
        this.m_tlasNodes = new Array<TLASNode>(blasInstances.length * 2);
        this.m_nodeUsed = 1; // keep root node empty
        this.m_offsetToMeshId = blasOffsetToMeshId;
        this.m_meshIDtoBLAS = meshIDToBLAS;
        this._build();
    }

    public get nodes() {
        return this.m_tlasNodes;
    }

    public writeNodesToArray(target: ArrayBuffer) {
        this.m_tlasNodes.forEach((node, idx) => {
            // aabbMin (vec3<f32>), 12 bytes, followed by 'left' (u32), 4 bytes
            let aabbMinArrayF32: Float32Array = new Float32Array(target, idx * TLAS_NODE_SIZE + 0, 3);
            let leftArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 12, 1);

            // aabbMax (vec3<f32>), 12 bytes, followed by 'right' (u32), 4 bytes
            let aabbMaxArrayF32: Float32Array = new Float32Array(target, idx * TLAS_NODE_SIZE + 16, 3);
            let rightArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 28, 1);

            // instanceIdx (u32), 4 bytes
            let instanceIdxArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 32, 1);

            // 12 bytes (3 floats) padding after instanceIdx
            let paddingArrayF32: Float32Array = new Float32Array(target, idx * TLAS_NODE_SIZE + 36, 3);

            // Setting AABB min and max
            aabbMinArrayF32.set([node.aabb.bmin[0], node.aabb.bmin[1], node.aabb.bmin[2]]);
            aabbMaxArrayF32.set([node.aabb.bmax[0], node.aabb.bmax[1], node.aabb.bmax[2]]);

            // Setting left, right child indices, and instance index
            leftArrayU32.set([node.left]);
            rightArrayU32.set([node.right]);
            instanceIdxArrayU32.set([node.blas]); // 'blas' is the instance index here

            // Setting padding to 0
            paddingArrayF32.set([0.0, 0.0, 0.0]); // 12 bytes of padding
        });
    }

    private _findBestMatch(nodeIdx: Uint32Array, nodeIndices: number, A: number): number {
        let smallestArea = Number.MAX_VALUE;
        let bestB: number = -1;

        for (let B = 0; B < nodeIndices; ++B) {
            if (A === B) continue;

            // Combine the AABBs of nodes A and B
            const combinedMin = [
                Math.min(this.m_tlasNodes[nodeIdx[A]].aabb.bmin[0], this.m_tlasNodes[nodeIdx[B]].aabb.bmin[0]),
                Math.min(this.m_tlasNodes[nodeIdx[A]].aabb.bmin[1], this.m_tlasNodes[nodeIdx[B]].aabb.bmin[1]),
                Math.min(this.m_tlasNodes[nodeIdx[A]].aabb.bmin[2], this.m_tlasNodes[nodeIdx[B]].aabb.bmin[2]),
            ];

            const combinedMax = [
                Math.max(this.m_tlasNodes[nodeIdx[A]].aabb.bmax[0], this.m_tlasNodes[nodeIdx[B]].aabb.bmax[0]),
                Math.max(this.m_tlasNodes[nodeIdx[A]].aabb.bmax[1], this.m_tlasNodes[nodeIdx[B]].aabb.bmax[1]),
                Math.max(this.m_tlasNodes[nodeIdx[A]].aabb.bmax[2], this.m_tlasNodes[nodeIdx[B]].aabb.bmax[2]),
            ];

            // Calculate the extent of the combined AABB
            const e = [
                combinedMax[0] - combinedMin[0],
                combinedMax[1] - combinedMin[1],
                combinedMax[2] - combinedMin[2],
            ];

            // Calculate the surface area of the combined AABB
            const surfaceArea = e[0] * e[1] + e[1] * e[2] + e[2] * e[0];

            // Find the pair with the smallest surface area
            if (surfaceArea < smallestArea) {
                smallestArea = surfaceArea;
                bestB = B;
            }
        }

        return bestB;
    }

    private _build(): void {
        let nodeIndices = this.m_blasInstances.length;
        let nodeIdx: Uint32Array = new Uint32Array(nodeIndices);

        for (let i = 0; i < this.m_blasInstances.length; ++i) {
            nodeIdx[i] = this.m_nodeUsed;

            let meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset);
            if (meshID === undefined) throw new Error("Mesh ID not found");

            let blas = this.m_meshIDtoBLAS.get(meshID);
            if (blas === undefined) throw new Error("BLAS not found");

            // Copy AABB from BLAS and transform it using the instance's transformation matrix
            let blasAABB = new AABB(
                vec3.clone(blas.nodes[0].aabb.bmax),
                vec3.clone(blas.nodes[0].aabb.bmin)
            );

            let transform = this.m_blasInstances[i].transform;
            this._transformAABB(blasAABB, transform);

            let tlasNode: TLASNode = {
                aabb: blasAABB,
                left: 0,
                right: 0,
                blas: i,
            };

            this.m_tlasNodes[this.m_nodeUsed] = tlasNode;
            this.m_nodeUsed++;
        }

        let A = 0;
        let B = this._findBestMatch(nodeIdx, nodeIndices, A);

        while (nodeIndices > 1) {
            let C = this._findBestMatch(nodeIdx, nodeIndices, B);

            if (A === C) {
                // Combine AABBs for nodes A and B
                let combinedAABB = new AABB();
                combinedAABB.growByAABB(this.m_tlasNodes[nodeIdx[A]].aabb);
                combinedAABB.growByAABB(this.m_tlasNodes[nodeIdx[B]].aabb);

                let newNode: TLASNode = {
                    aabb: combinedAABB,
                    left: nodeIdx[A],
                    right: nodeIdx[B],
                    blas: 0
                };

                this.m_tlasNodes[this.m_nodeUsed] = newNode;
                nodeIdx[A] = this.m_nodeUsed++;
                nodeIdx[B] = nodeIdx[nodeIndices - 1];
                B = this._findBestMatch(nodeIdx, --nodeIndices, A);
            } else {
                A = B;
                B = C;
            }
        }

        // Root node
        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIdx[A]];
    }

    private _transformAABB(aabb: AABB, transform: mat4): void {
        // Transform the AABB min and max points using the transformation matrix
        vec3.transformMat4(aabb.bmin, aabb.bmin, transform);
        vec3.transformMat4(aabb.bmax, aabb.bmax, transform);
    }

}
