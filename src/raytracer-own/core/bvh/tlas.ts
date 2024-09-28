import { mat4, vec3 } from "gl-matrix";
import { BLAS } from "./blas";
import { BLASInstance } from "./blas-instance";
import { AABB } from "../node";

export interface TLASNode {
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

    private _findBestMatch(nodeIdx: Uint32Array, nodeIndices: number, A: number): number {
        let smallestArea = Number.MAX_VALUE;
        let bestB: number = -1;

        for (let B = 0; B < nodeIndices; ++B) {
            if (A === B) continue;

            const bmax = vec3.create();
            vec3.max(bmax, this.m_tlasNodes[nodeIdx[A]].aabb.bmax, this.m_tlasNodes[nodeIdx[B]].aabb.bmax);

            const bmin = vec3.create();
            vec3.min(bmin, this.m_tlasNodes[nodeIdx[A]].aabb.bmin, this.m_tlasNodes[nodeIdx[B]].aabb.bmin);

            const e = vec3.create();
            vec3.subtract(e, bmax, bmin);

            const surfaceArea = e[0] * e[1] + e[1] * e[2] + e[2] * e[0];

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
            const meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset);
            if (meshID === undefined) throw new Error('Mesh ID not found');
            const blas = this.m_meshIDtoBLAS.get(meshID);
            if (blas === undefined) throw new Error('BLAS not found');

            const blasAABB = new AABB();
            this._transformAABB(blasAABB, blas.m_nodes[0].aabb, this.m_blasInstances[i].transform);

            const tlasNode: TLASNode = {
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
                const newAABB = this.m_tlasNodes[nodeIdx[A]].aabb.union(this.m_tlasNodes[nodeIdx[B]].aabb);

                const newNode: TLASNode = {
                    aabb: newAABB,
                    left: nodeIdx[A],
                    right: nodeIdx[B],
                    blas: 0,
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
        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIdx[A]];
    }

    private _transformAABB(out: AABB, aabb: AABB, matrix: mat4): void {
        // Transform the 8 corners of the AABB and compute the new AABB that encloses them
        const corners = [
            vec3.fromValues(aabb.bmin[0], aabb.bmin[1], aabb.bmin[2]),
            vec3.fromValues(aabb.bmax[0], aabb.bmin[1], aabb.bmin[2]),
            vec3.fromValues(aabb.bmin[0], aabb.bmax[1], aabb.bmin[2]),
            vec3.fromValues(aabb.bmin[0], aabb.bmin[1], aabb.bmax[2]),
            vec3.fromValues(aabb.bmax[0], aabb.bmax[1], aabb.bmin[2]),
            vec3.fromValues(aabb.bmax[0], aabb.bmin[1], aabb.bmax[2]),
            vec3.fromValues(aabb.bmin[0], aabb.bmax[1], aabb.bmax[2]),
            vec3.fromValues(aabb.bmax[0], aabb.bmax[1], aabb.bmax[2]),
        ];

        const transformedCorners = corners.map((corner) => {
            const transformed = vec3.create();
            vec3.transformMat4(transformed, corner, matrix);
            return transformed;
        });

        const newBmin = vec3.fromValues(Infinity, Infinity, Infinity);
        const newBmax = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for (const corner of transformedCorners) {
            vec3.min(newBmin, newBmin, corner);
            vec3.max(newBmax, newBmax, corner);
        }

        out.bmin = newBmin;
        out.bmax = newBmax;
    }
}