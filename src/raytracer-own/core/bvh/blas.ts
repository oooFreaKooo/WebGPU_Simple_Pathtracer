import { Triangle } from "../triangle";
import { AABB } from "../node"

export interface BLASNode {
    leftFirst: number;
    triangleCount: number;
    aabb: AABB;
}

const BINS: number = 10;

export class BLAS {
    m_triangles: Triangle[];
    m_nodes: Array<BLASNode>;
    m_rootNodeIdx: number = 0;
    m_nodeCount: number = 0;
    m_triangleIndices: Uint32Array;

    public constructor(triangles: Triangle[]) {
        this.m_triangles = triangles;

        const N: number = triangles.length;
        this.m_nodes = new Array<BLASNode>(N * 2 - 1);
        this.m_triangleIndices = new Uint32Array(N);
        this.m_nodeCount = 1;

        this._buildBLAS();
    }

    private _buildBLAS(): void {
        // Set initial triangle indices
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            this.m_triangleIndices[i] = i;
        }
        // Initialize root node
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
        const node = this.m_nodes[nodeIdx];
        const first = node.leftFirst;
        const nodeAABB = new AABB();

        for (let i = 0; i < node.triangleCount; i++) {
            const triIdx = this.m_triangleIndices[first + i];
            const triangle = this.m_triangles[triIdx];

            // Update node AABB with triangle's corners
            for (const corner of triangle.corners) {
                nodeAABB.grow(corner);
            }
        }

        node.aabb = nodeAABB;
        this.m_nodes[nodeIdx] = node;
    }

    private _findBestSplit(nodeIdx: number): [number, number, number] {
        const node = this.m_nodes[nodeIdx];
        let bestAxis: number = -1;
        let bestPos: number = 0.0;
        let bestCost = Number.MAX_VALUE;
        const BINS = 8; // Number of bins for SAH

        for (let axis = 0; axis < 3; axis++) {
            let boundsMin = Number.MAX_VALUE;
            let boundsMax = -Number.MAX_VALUE;

            // Compute bounds of centroids along this axis
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i];
                const centroid = this.m_triangles[triIdx].centroid;
                boundsMin = Math.min(boundsMin, centroid[axis]);
                boundsMax = Math.max(boundsMax, centroid[axis]);
            }

            if (boundsMin === boundsMax) {
                continue;
            }

            // Initialize bins
            type Bin = { aabb: AABB; triCount: number };
            const bins: Bin[] = Array.from({ length: BINS }, () => ({
                aabb: new AABB(),
                triCount: 0,
            }));

            const scale: number = BINS / (boundsMax - boundsMin);

            // Distribute triangles into bins
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i];
                const triangle = this.m_triangles[triIdx];
                const centroid = triangle.centroid;
                const binIdx = Math.min(
                    BINS - 1,
                    Math.floor((centroid[axis] - boundsMin) * scale)
                );

                bins[binIdx].triCount++;
                for (const corner of triangle.corners) {
                    bins[binIdx].aabb.grow(corner);
                }
            }

            // Compute cumulative counts and areas
            const leftCount: number[] = [];
            const rightCount: number[] = [];
            const leftArea: number[] = [];
            const rightArea: number[] = [];

            const leftAABB = new AABB();
            let leftSum = 0;

            // Left to right
            for (let i = 0; i < BINS - 1; i++) {
                leftSum += bins[i].triCount;
                leftCount[i] = leftSum;
                leftAABB.growByAABB(bins[i].aabb);
                leftArea[i] = leftAABB.area();
            }

            const rightAABB = new AABB();
            let rightSum = 0;

            // Right to left
            for (let i = BINS - 1; i > 0; i--) {
                rightSum += bins[i].triCount;
                rightCount[i - 1] = rightSum;
                rightAABB.growByAABB(bins[i].aabb);
                rightArea[i - 1] = rightAABB.area();
            }

            const binWidth = (boundsMax - boundsMin) / BINS;

            // Find the best split position along this axis
            for (let i = 0; i < BINS - 1; i++) {
                const cost = leftCount[i] * leftArea[i] + rightCount[i] * rightArea[i];
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
        const area = node.aabb.area();
        return area * node.triangleCount;
    }

    private _subdivideNode(nodeIdx: number): void {
        const node = this.m_nodes[nodeIdx];

        // Find the best split
        const [bestAxis, bestPos, bestCost] = this._findBestSplit(nodeIdx);
        const parentCost = this._calculateNodeCost(nodeIdx);

        if (bestCost >= parentCost) {
            return; // No beneficial split found
        }

        const axis = bestAxis;
        const splitPos = bestPos;

        // Partition triangles based on split axis and position
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while (i <= j) {
            const triIdx = this.m_triangleIndices[i];
            const centroid = this.m_triangles[triIdx].centroid;
            if (centroid[axis] < splitPos) {
                i++;
            } else {
                // Swap indices
                [this.m_triangleIndices[i], this.m_triangleIndices[j]] = [
                    this.m_triangleIndices[j],
                    this.m_triangleIndices[i],
                ];
                j--;
            }
        }

        // Abort if one side is empty
        const leftCount = i - node.leftFirst;
        if (leftCount === 0 || leftCount === node.triangleCount) {
            return;
        }

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

        // Update current node
        node.leftFirst = leftChildIdx;
        node.triangleCount = 0; // Indicates internal node
        this.m_nodes[nodeIdx] = node;

        // Update AABBs for child nodes
        this._updateAABBs(leftChildIdx);
        this._updateAABBs(rightChildIdx);

        // Recursively subdivide child nodes
        this._subdivideNode(leftChildIdx);
        this._subdivideNode(rightChildIdx);
    }
}