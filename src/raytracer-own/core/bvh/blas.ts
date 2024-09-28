import { vec3 } from "gl-matrix";
import { Triangle } from "../triangle";
import { AABB, Node } from "../node"

interface BLASNode {
    leftFirst: number;
    triangleCount: number;
    aabb: AABB;
}

interface Bin {
    aabb: AABB;
    triCount: number;
}


const BINS: number = 10;
const BLAS_NODE_SIZE: number = 12; // 12 floats
const BLAS_NODE_BYTE_SIZE: number = 1 * 4 + // leftFirst (float)
    1 * 4 + // triangleCount (float)
    2 * 4 + // padding
    3 * 4 + // aabb min (float3)
    1 * 4 + // padding
    3 * 4 + // aabb max (float3)
    1 * 4   // padding

export class BLAS {

    m_triangles: Triangle[];
    m_nodes: Array<BLASNode>;
    m_centroids: Float32Array;
    m_rootNodeIdx: number = 0;
    m_nodeCount: number = 0;
    m_triangleIndices: Uint32Array;

    constructor(triangles: Triangle[]) {
        this.m_triangles = triangles;

        let N: number = this.m_triangles.length;
        this.m_nodes = new Array<BLASNode>(N * 2 - 1);
        this.m_centroids = new Float32Array(N * 3);
        this.m_triangleIndices = new Uint32Array(N);
        this.m_nodeCount = 1;

        this._buildBLAS();
    }

    public get nodes(): Readonly<Array<BLASNode>> {
        return this.m_nodes;
    }

    public get triangleIndices(): Readonly<Uint32Array> {
        return this.m_triangleIndices;
    }

    public writeNodesToArray(target: Float32Array, nodeOffset: number = 0, triangleIdxOffset: number = 0): void {
        this.m_nodes.forEach((node, i) => {
            const baseIndex = (nodeOffset + i) * BLAS_NODE_SIZE;

            // aabbMin
            target[baseIndex + 0] = node.aabb.bmin[0]; // x
            target[baseIndex + 1] = node.aabb.bmin[1]; // y
            target[baseIndex + 2] = node.aabb.bmin[2]; // z

            // leftFirst
            target[baseIndex + 3] = node.triangleCount > 0 ? node.leftFirst + triangleIdxOffset : node.leftFirst + nodeOffset;

            // aabbMax
            target[baseIndex + 4] = node.aabb.bmax[0]; // x
            target[baseIndex + 5] = node.aabb.bmax[1]; // y
            target[baseIndex + 6] = node.aabb.bmax[2]; // z

            // triCount
            target[baseIndex + 7] = node.triangleCount;
        });
    }

    public writeTriangleIndicesToArray(target: Uint32Array, triangleIdxOffset: number = 0): void {
        this.m_triangleIndices.forEach((triangleIdx, i) => {
            target[triangleIdxOffset + i] = triangleIdxOffset + triangleIdx;
        });
    }

    private _buildBLAS(): void {
        // set initial triangle indices
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            this.m_triangleIndices[i] = i;
        }

        // set centroids from triangles
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            let triangle = this.m_triangles[i];
            triangle.make_centroid(); // Ensure centroid is computed
            this.m_centroids[i * 3 + 0] = triangle.centroid[0];
            this.m_centroids[i * 3 + 1] = triangle.centroid[1];
            this.m_centroids[i * 3 + 2] = triangle.centroid[2];
        }

        // Initialize root node with AABB and triangle count
        this.m_nodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIndices.length,
            aabb: new AABB(),
        };

        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);

        this.m_nodes.splice(this.m_nodeCount);
    }

    private _updateAABBs(nodeIdx: number): void {
        let node = this.m_nodes[nodeIdx];
        let first = node.leftFirst;

        for (let i = 0; i < node.triangleCount; i++) {
            let triIdx = this.m_triangleIndices[first + i];
            let triangle = this.m_triangles[triIdx];

            // Grow the node's AABB by the corners of the triangle
            triangle.corners.forEach(corner => {
                node.aabb.grow(corner);
            });
        }

        this.m_nodes[nodeIdx] = node;
    }


    private _findBestSplit(nodeIdx: number): [number, number, number] {
        let node = this.m_nodes[nodeIdx];
        let bestAxis: number = -1;
        let bestPos: number = 0.0;
        let bestCost = Number.MAX_VALUE;

        for (let axis = 0; axis < 3; axis++) {
            let boundsMin = Number.MAX_VALUE;
            let boundsMax = -Number.MAX_VALUE;

            for (let i = 0; i < node.triangleCount; i++) {
                let triIdx = this.m_triangleIndices[node.leftFirst + i];
                let centroid = this.m_triangles[triIdx].centroid[axis];
                boundsMin = Math.min(boundsMin, centroid);
                boundsMax = Math.max(boundsMax, centroid);
            }

            if (boundsMin === boundsMax) {
                continue;
            }

            let bin: Bin[] = new Array(BINS).fill(null).map(() => ({ aabb: new AABB(), triCount: 0 }));

            let scale: number = BINS / (boundsMax - boundsMin);
            for (let i = 0; i < node.triangleCount; i++) {
                let triIdx = this.m_triangleIndices[node.leftFirst + i];
                let centroid = this.m_triangles[triIdx].centroid[axis];
                let binIdx = Math.min(BINS - 1, Math.floor((centroid - boundsMin) * scale));

                let triangle = this.m_triangles[triIdx];

                bin[binIdx].triCount++;
                triangle.corners.forEach(corner => {
                    bin[binIdx].aabb.grow(corner);
                });
            }

            let leftBox = new AABB();
            let rightBox = new AABB();
            let leftCount: Uint32Array = new Uint32Array(BINS - 1);
            let rightCount: Uint32Array = new Uint32Array(BINS - 1);
            let leftArea: Float32Array = new Float32Array(BINS - 1);
            let rightArea: Float32Array = new Float32Array(BINS - 1);
            let leftSum = 0;
            let rightSum = 0;

            for (let i = 0; i < BINS - 1; i++) {
                leftBox.growByAABB(bin[i].aabb);
                leftCount[i] = leftSum += bin[i].triCount;
                leftArea[i] = leftBox.area();
                rightBox.growByAABB(bin[BINS - 1 - i].aabb);
                rightCount[BINS - 2 - i] = rightSum += bin[BINS - 1 - i].triCount;
                rightArea[BINS - 2 - i] = rightBox.area();
            }

            scale = (boundsMax - boundsMin) / BINS;
            for (let i = 0; i < BINS - 1; i++) {
                let cost = leftCount[i] * leftArea[i] + rightCount[i] * rightArea[i];
                if (cost < bestCost) {
                    bestAxis = axis;
                    bestPos = boundsMin + scale * (i + 1);
                    bestCost = cost;
                }
            }
        }

        return [bestAxis, bestPos, bestCost];
    }


    private _calculateNodeCost(nodeIdx: number): number {
        let node = this.m_nodes[nodeIdx];
        let extent = [
            node.aabb.bmax[0] - node.aabb.bmin[0],
            node.aabb.bmax[1] - node.aabb.bmin[1],
            node.aabb.bmax[2] - node.aabb.bmin[2],
        ];
        let area = extent[0] * extent[1] + extent[1] * extent[2] + extent[2] * extent[0];
        return area * node.triangleCount;
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_nodes[nodeIdx];

        // find split axis
        let bestAxis: number;
        let bestPos: number;
        let bestCost: number;

        [bestAxis, bestPos, bestCost] = this._findBestSplit(nodeIdx);

        let parentCost = this._calculateNodeCost(nodeIdx);

        if (bestCost >= parentCost) {
            return;
        }

        let axis = bestAxis;
        let splitPos = bestPos;

        // Quicksort triangles based on split axis
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while (i <= j) {
            let triIdx = this.m_triangleIndices[i];
            let centroid = this._getCentroid(triIdx);
            if (centroid[axis] < splitPos) {
                i++;
            } else {
                let tmp = this.m_triangleIndices[i];
                this.m_triangleIndices[i] = this.m_triangleIndices[j];
                this.m_triangleIndices[j] = tmp;
                j--;
            }
        }

        // abort if one side is empty
        let leftCount = i - node.leftFirst;
        if (leftCount === 0 || leftCount === node.triangleCount) {
            return;
        }

        // create child nodes
        let leftChildIdx = this.m_nodeCount;
        this.m_nodeCount++;
        let rightChildIdx = this.m_nodeCount;
        this.m_nodeCount++;

        this.m_nodes[leftChildIdx] = {
            leftFirst: node.leftFirst,
            triangleCount: leftCount,
            aabb: new AABB()
        };

        this.m_nodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            aabb: new AABB()
        };

        node.leftFirst = leftChildIdx;
        node.triangleCount = 0;
        this.m_nodes[nodeIdx] = node;

        this._updateAABBs(leftChildIdx);
        this._updateAABBs(rightChildIdx);

        // recurse
        this._subdivideNode(leftChildIdx);
        this._subdivideNode(rightChildIdx);
    }

    private _getCentroid(triIdx: number): vec3 {
        return [
            this.m_centroids[triIdx * 3 + 0],
            this.m_centroids[triIdx * 3 + 1],
            this.m_centroids[triIdx * 3 + 2],
        ];
    }
}