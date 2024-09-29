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

    public constructor(
        blasInstances: Array<BLASInstance>,
        blasOffsetToMeshId: Map<number, number>,
        meshIDToBLAS: Map<number, BLAS>
    ) {
        this.m_blasInstances = blasInstances;
        this.m_tlasNodes = new Array<TLASNode>(blasInstances.length * 2);
        this.m_nodeUsed = 1; // Keep root node empty
        this.m_offsetToMeshId = blasOffsetToMeshId;
        this.m_meshIDtoBLAS = meshIDToBLAS;
        this._build();
    }

    private _findBestMatch(
        nodeIdx: Uint32Array,
        nodeIndices: number,
        A: number
    ): number {
        let smallestArea = Number.MAX_VALUE;
        let bestB = -1;

        for (let B = 0; B < nodeIndices; ++B) {
            if (A === B) continue;

            const aabbA = this.m_tlasNodes[nodeIdx[A]].aabb;
            const aabbB = this.m_tlasNodes[nodeIdx[B]].aabb;

            const bmax = vec3.create();
            const bmin = vec3.create();
            vec3.max(bmax, aabbA.bmax, aabbB.bmax);
            vec3.min(bmin, aabbA.bmin, aabbB.bmin);

            const e = vec3.create();
            vec3.sub(e, bmax, bmin);
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
        const nodeIdx = new Uint32Array(nodeIndices);

        for (let i = 0; i < this.m_blasInstances.length; ++i) {
            nodeIdx[i] = this.m_nodeUsed;

            const meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset);
            if (meshID === undefined) throw new Error("Mesh ID not found");

            const blas = this.m_meshIDtoBLAS.get(meshID);
            if (blas === undefined) throw new Error("BLAS not found");

            const blasAABB = blas.m_nodes[0].aabb.clone();
            const transform = mat4.clone(this.m_blasInstances[i].transform);
            blasAABB.applyMatrix4(transform);

            const tlasNode: TLASNode = {
                aabb: blasAABB,
                left: 0,
                right: 0,
                blas: i,
            };
            this.m_tlasNodes[this.m_nodeUsed++] = tlasNode;
        }

        let A = 0;
        let B = this._findBestMatch(nodeIdx, nodeIndices, A);

        while (nodeIndices > 1) {
            const C = this._findBestMatch(nodeIdx, nodeIndices, B);

            if (A === C) {
                const aabbA = this.m_tlasNodes[nodeIdx[A]].aabb;
                const aabbB = this.m_tlasNodes[nodeIdx[B]].aabb;
                const newAABB = aabbA.union(aabbB);

                const newNode: TLASNode = {
                    aabb: newAABB,
                    left: nodeIdx[A],
                    right: nodeIdx[B],
                    blas: 0,
                };

                this.m_tlasNodes[this.m_nodeUsed] = newNode;
                nodeIdx[A] = this.m_nodeUsed++;
                nodeIdx[B] = nodeIdx[--nodeIndices];
                B = this._findBestMatch(nodeIdx, nodeIndices, A);
            } else {
                A = B;
                B = C;
            }
        }

        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIdx[A]];
    }
}