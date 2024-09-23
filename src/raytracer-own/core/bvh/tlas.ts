import { mat4, vec3 } from "gl-matrix";
import { AABB } from "../node";
import { BLAS } from "./blas";


export class BVHInstance {
    bounds: AABB;
    invTransform: mat4;
    blas: BLAS;

    constructor(blas: BLAS, transform: mat4 = mat4.create()) {
        this.blas = blas;
        this.setTransform(transform);
    }

    setTransform(transform: mat4): void {
        this.invTransform = mat4.invert(mat4.create(), transform);
        this.bounds = new AABB(); // initialize empty AABB
        this.growBounds(this.blas.bounds, transform);
    }

    private growBounds(bounds: AABB, transform: mat4): void {
        const corners = [
            vec3.fromValues(bounds.bmin[0], bounds.bmin[1], bounds.bmin[2]),
            vec3.fromValues(bounds.bmax[0], bounds.bmin[1], bounds.bmin[2]),
            vec3.fromValues(bounds.bmin[0], bounds.bmax[1], bounds.bmin[2]),
            vec3.fromValues(bounds.bmax[0], bounds.bmax[1], bounds.bmin[2]),
            vec3.fromValues(bounds.bmin[0], bounds.bmin[1], bounds.bmax[2]),
            vec3.fromValues(bounds.bmax[0], bounds.bmin[1], bounds.bmax[2]),
            vec3.fromValues(bounds.bmin[0], bounds.bmax[1], bounds.bmax[2]),
            vec3.fromValues(bounds.bmax[0], bounds.bmax[1], bounds.bmax[2]),
        ];

        corners.forEach((corner) => {
            const transformedCorner = vec3.create();
            vec3.transformMat4(transformedCorner, corner, transform);
            this.bounds.grow(transformedCorner);
        });
    }
}


export class TLASNode {
    aabbMin: vec3;
    aabbMax: vec3;
    leftFirst: number;
    BLAS: number;

    constructor() {
        this.aabbMin = [0, 0, 0];
        this.aabbMax = [0, 0, 0];
        this.leftFirst = 0;
        this.BLAS = -1;
    }

    isLeaf(): boolean {
        return this.leftFirst === 0;
    }

    getLeftChildIndex(): number {
        return this.leftFirst & 0xFFFF;
    }

    getRightChildIndex(): number {
        return (this.leftFirst >>> 16) & 0xFFFF;
    }

    copyFrom(node: TLASNode) {
        vec3.copy(this.aabbMin, node.aabbMin);
        vec3.copy(this.aabbMax, node.aabbMax);
        this.leftFirst = node.leftFirst;
        this.BLAS = node.BLAS;
    }
}

export class TLAS {
    blas: BVHInstance[];
    blasCount: number;
    tlasNode: TLASNode[];
    nodesUsed: number;

    constructor(bvhList: BVHInstance[], N: number) {
        // Copy the array of bottom-level acceleration structure instances
        this.blas = bvhList;
        this.blasCount = N;

        // Allocate TLAS nodes
        const totalNodes = 2 * N;
        this.tlasNode = new Array<TLASNode>(totalNodes);
        for (let i = 0; i < totalNodes; i++) {
            this.tlasNode[i] = new TLASNode();
        }
        this.nodesUsed = 2;
    }

    FindBestMatch(list: number[], N: number, A: number): number {
        // Find BLAS B that, when joined with A, forms the smallest AABB
        let smallest = Number.MAX_VALUE;
        let bestB = -1;

        for (let B = 0; B < N; B++) {
            if (B !== A) {
                const nodeA = this.tlasNode[list[A]];
                const nodeB = this.tlasNode[list[B]];

                const bmax = vec3.create();
                const bmin = vec3.create();
                vec3.max(bmax, nodeA.aabbMax, nodeB.aabbMax);
                vec3.min(bmin, nodeA.aabbMin, nodeB.aabbMin);

                const e = vec3.create();
                vec3.subtract(e, bmax, bmin);

                const surfaceArea = e[0] * e[1] + e[1] * e[2] + e[2] * e[0];
                if (surfaceArea < smallest) {
                    smallest = surfaceArea;
                    bestB = B;
                }
            }
        }
        return bestB;
    }

    Build() {
        // Assign a TLAS leaf node to each BLAS
        const nodeIdx: number[] = new Array<number>(this.blasCount);
        let nodeIndices = this.blasCount;
        this.nodesUsed = 1;

        for (let i = 0; i < this.blasCount; i++) {
            nodeIdx[i] = this.nodesUsed;
            const node = this.tlasNode[this.nodesUsed];
            vec3.copy(node.aabbMin, this.blas[i].bounds.bmin);
            vec3.copy(node.aabbMax, this.blas[i].bounds.bmax);
            node.BLAS = i;
            node.leftFirst = 0; // Makes it a leaf
            this.nodesUsed++;
        }

        // Use agglomerative clustering to build the TLAS
        let A = 0;
        let B = this.FindBestMatch(nodeIdx, nodeIndices, A);

        while (nodeIndices > 1) {
            const C = this.FindBestMatch(nodeIdx, nodeIndices, B);
            if (A === C) {
                const nodeIdxA = nodeIdx[A];
                const nodeIdxB = nodeIdx[B];
                const nodeA = this.tlasNode[nodeIdxA];
                const nodeB = this.tlasNode[nodeIdxB];
                const newNode = this.tlasNode[this.nodesUsed];

                // Pack the left and right child indices into leftFirst
                newNode.leftFirst = (nodeIdxB << 16) | nodeIdxA;

                // Compute the bounding box for the new internal node
                vec3.min(newNode.aabbMin, nodeA.aabbMin, nodeB.aabbMin);
                vec3.max(newNode.aabbMax, nodeA.aabbMax, nodeB.aabbMax);

                // Internal node has no BLAS index
                newNode.BLAS = -1;

                // Update node indices
                nodeIdx[A] = this.nodesUsed;
                this.nodesUsed++;

                nodeIdx[B] = nodeIdx[nodeIndices - 1];
                nodeIndices--;

                // Find the best match for A again
                B = this.FindBestMatch(nodeIdx, nodeIndices, A);
            } else {
                A = B;
                B = C;
            }
        }

        // Copy the final node to the root
        this.tlasNode[0].copyFrom(this.tlasNode[nodeIdx[A]]);
    }
}