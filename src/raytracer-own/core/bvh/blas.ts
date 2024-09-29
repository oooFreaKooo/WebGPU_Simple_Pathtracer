import { Triangle } from "../triangle";
import { AABB } from "../node";

export interface BLASNode {
    leftFirst: number;
    triangleCount: number;
    aabb: AABB;
}

const BINS = 10;

export class BLAS {
    id: string;
    m_triangles: Triangle[];
    m_nodes: BLASNode[];
    m_triangleIndices: Uint32Array;
    private m_rootNodeIdx = 0;
    private m_nodeCount = 1;

    constructor(id: string, triangles: Triangle[]) {
        this.id = id;
        this.m_triangles = triangles;
        const N = triangles.length;
        this.m_nodes = new Array<BLASNode>(N * 2 - 1);
        this.m_triangleIndices = new Uint32Array(N);

        this._initializeBLAS();
    }

    private _initializeBLAS(): void {
        // Initialize triangle indices
        this.m_triangleIndices.forEach((_, i) => {
            this.m_triangleIndices[i] = i;
        });

        // Create root node
        this.m_nodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIndices.length,
            aabb: new AABB(),
        };

        this._updateAABB(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);

        // Trim unused nodes
        this.m_nodes.length = this.m_nodeCount;
    }

    private _updateAABB(nodeIdx: number): void {
        const node = this.m_nodes[nodeIdx];
        const { leftFirst, triangleCount } = node;
        const nodeAABB = new AABB();

        for (let i = 0; i < triangleCount; i++) {
            const triIdx = this.m_triangleIndices[leftFirst + i];
            const triangle = this.m_triangles[triIdx];
            triangle.corners.forEach(corner => nodeAABB.grow(corner));
        }

        node.aabb = nodeAABB;
    }

    private _findBestSplit(nodeIdx: number): [number, number, number] {
        const node = this.m_nodes[nodeIdx];
        let bestAxis = -1;
        let bestPos = 0;
        let bestCost = Infinity;

        for (let axis = 0; axis < 3; axis++) {
            let boundsMin = Infinity;
            let boundsMax = -Infinity;

            // Find bounds of centroids along the axis
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i];
                const centroid = this.m_triangles[triIdx].centroid;
                boundsMin = Math.min(boundsMin, centroid[axis]);
                boundsMax = Math.max(boundsMax, centroid[axis]);
            }

            if (boundsMin === boundsMax) continue;

            const scale = BINS / (boundsMax - boundsMin);
            const binsArray: { aabb: AABB; count: number }[] = Array.from({ length: BINS }, () => ({
                aabb: new AABB(),
                count: 0,
            }));

            // Distribute triangles into bins
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i];
                const centroid = this.m_triangles[triIdx].centroid;
                const binIdx = Math.min(BINS - 1, Math.floor((centroid[axis] - boundsMin) * scale));
                const bin = binsArray[binIdx];
                bin.count++;
                this.m_triangles[triIdx].corners.forEach(corner => bin.aabb.grow(corner));
            }

            // Compute cumulative counts and areas
            const leftCounts: number[] = [];
            const rightCounts: number[] = [];
            const leftAreas: number[] = [];
            const rightAreas: number[] = [];

            let leftAABB = new AABB();
            let leftCount = 0;
            for (let i = 0; i < BINS - 1; i++) {
                leftCount += binsArray[i].count;
                leftCounts[i] = leftCount;
                leftAABB.growByAABB(binsArray[i].aabb);
                leftAreas[i] = leftAABB.area();
            }

            let rightAABB = new AABB();
            let rightCount = 0;
            for (let i = BINS - 1; i > 0; i--) {
                rightCount += binsArray[i].count;
                rightCounts[i - 1] = rightCount;
                rightAABB.growByAABB(binsArray[i].aabb);
                rightAreas[i - 1] = rightAABB.area();
            }

            const binWidth = (boundsMax - boundsMin) / BINS;

            // Evaluate split cost
            for (let i = 0; i < BINS - 1; i++) {
                const cost = leftCounts[i] * leftAreas[i] + rightCounts[i] * rightAreas[i];
                if (cost < bestCost) {
                    bestAxis = axis;
                    bestPos = boundsMin + binWidth * (i + 1);
                    bestCost = cost;
                }
            }
        }

        return [bestAxis, bestPos, bestCost];
    }

    private _calculateNodeCost(nodeIdx: number): number {
        const node = this.m_nodes[nodeIdx];
        return node.aabb.area() * node.triangleCount;
    }

    private _subdivideNode(nodeIdx: number): void {
        const node = this.m_nodes[nodeIdx];
        const [bestAxis, bestPos, bestCost] = this._findBestSplit(nodeIdx);
        const parentCost = this._calculateNodeCost(nodeIdx);

        if (bestCost >= parentCost) return; // No beneficial split

        const axis = bestAxis;
        const splitPos = bestPos;
        let i = node.leftFirst;
        let j = node.leftFirst + node.triangleCount - 1;

        // Partition triangles based on split
        while (i <= j) {
            const triIdx = this.m_triangleIndices[i];
            const centroid = this.m_triangles[triIdx].centroid;
            if (centroid[axis] < splitPos) {
                i++;
            } else {
                [this.m_triangleIndices[i], this.m_triangleIndices[j]] = [this.m_triangleIndices[j], this.m_triangleIndices[i]];
                j--;
            }
        }

        const leftCount = i - node.leftFirst;
        if (leftCount === 0 || leftCount === node.triangleCount) return; // Abort split

        // Create child nodes
        const leftChildIdx = this.m_nodeCount++;
        const rightChildIdx = this.m_nodeCount++;

        this.m_nodes[leftChildIdx] = {
            leftFirst: node.leftFirst,
            triangleCount: leftCount,
            aabb: new AABB(),
        };

        this.m_nodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            aabb: new AABB(),
        };

        // Update current node to internal node
        node.leftFirst = leftChildIdx;
        node.triangleCount = 0;
        this.m_nodes[nodeIdx] = node;

        // Update AABBs and subdivide children
        this._updateAABB(leftChildIdx);
        this._updateAABB(rightChildIdx);
        this._subdivideNode(leftChildIdx);
        this._subdivideNode(rightChildIdx);
    }
}
