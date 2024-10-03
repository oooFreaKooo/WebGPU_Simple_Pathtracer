import { Triangle } from '../triangle'
import { AABB } from '../node'
import { vec3 } from 'gl-matrix'

export interface BLASNode {
    leftFirst: number;
    triangleCount: number;
    aabb: AABB;
}

const BINS = 8

export class BLAS {
    id: string
    m_triangles: Triangle[]
    m_nodes: BLASNode[]
    m_triangleIndices: Uint32Array
    m_rootNodeIdx: number = 0
    m_nodeCount: number = 0

    constructor (id: string, triangles: Triangle[]) {
        this.id = id
        this.m_triangles = triangles

        const N = triangles.length
        this.m_nodes = new Array<BLASNode>(N * 2 - 1) // Preallocate enough nodes
        this.m_triangleIndices = new Uint32Array(N) // Indices for all triangles
        this.m_nodeCount = 1 // Root node starts with count 1
        this._initializeBLAS()
    }

    private _initializeBLAS (): void {
        // Initialize triangle indices
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            this.m_triangleIndices[i] = i
        }

        // Create root node
        const rootAABB = new AABB()
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            const triIdx = this.m_triangleIndices[i]
            const triangle = this.m_triangles[triIdx]
            triangle.corners.forEach(corner => rootAABB.grow(corner))
        }

        this.m_nodes[this.m_rootNodeIdx] = {
            leftFirst: 0, // Start index in triangleIndices
            triangleCount: this.m_triangleIndices.length,
            aabb: rootAABB,
        }

        // Subdivide the root node
        this._subdivideNode(this.m_rootNodeIdx)

        // Remove unused nodes after subdivision
        this.m_nodes.length = this.m_nodeCount
    }

    private _findBestSplit (nodeIdx: number): [number, number, number] {
        const node = this.m_nodes[nodeIdx]
        let bestAxis = -1
        let bestPos = 0
        let bestCost = Number.MAX_VALUE

        const centroidBounds: [number, number, number][] = []

        // Calculate bounds of centroids for each axis
        for (let i = 0; i < node.triangleCount; i++) {
            const triIdx = this.m_triangleIndices[node.leftFirst + i]
            const centroid: vec3 = this.m_triangles[triIdx].centroid
            // Convert vec3 to [number, number, number]
            centroidBounds.push([ centroid[0], centroid[1], centroid[2] ])
        }

        for (let axis = 0; axis < 3; axis++) {
            let min = Number.POSITIVE_INFINITY
            let max = Number.NEGATIVE_INFINITY

            for (let i = 0; i < centroidBounds.length; i++) {
                const value = centroidBounds[i][axis]
                if (value < min) {min = value}
                if (value > max) {max = value}
            }

            if (min === max) {continue} // All centroids are on the same position on this axis

            const scale = BINS / (max - min)
            const binsArray: { aabb: AABB; count: number }[] = Array.from({ length: BINS }, () => ({
                aabb: new AABB(),
                count: 0,
            }))

            // Distribute triangles into bins
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i]
                const centroid = centroidBounds[i][axis]
                const binIdx = Math.min(BINS - 1, Math.floor((centroid - min) * scale))
                const bin = binsArray[binIdx]
                bin.count++
                this.m_triangles[triIdx].corners.forEach(corner => bin.aabb.grow(corner))
            }

            // Compute prefix sums for left and right splits
            const leftCounts: number[] = new Array(BINS).fill(0)
            const rightCounts: number[] = new Array(BINS).fill(0)
            const leftAreas: number[] = new Array(BINS).fill(0)
            const rightAreas: number[] = new Array(BINS).fill(0)

            const leftAABB = new AABB()
            let leftCount = 0
            for (let i = 0; i < BINS - 1; i++) {
                leftCount += binsArray[i].count
                leftCounts[i] = leftCount
                leftAABB.growByAABB(binsArray[i].aabb)
                leftAreas[i] = leftAABB.area()
            }

            const rightAABB = new AABB()
            let rightCount = 0
            for (let i = BINS - 1; i > 0; i--) {
                rightCount += binsArray[i].count
                rightCounts[i - 1] = rightCount
                rightAABB.growByAABB(binsArray[i].aabb)
                rightAreas[i - 1] = rightAABB.area()
            }

            const binWidth = (max - min) / BINS

            // Evaluate split cost
            for (let i = 0; i < BINS - 1; i++) {
                const cost = leftCounts[i] * leftAreas[i] + rightCounts[i] * rightAreas[i]
                if (cost < bestCost) {
                    bestAxis = axis
                    bestPos = min + binWidth * (i + 1)
                    bestCost = cost
                }
            }
        }

        return [ bestAxis, bestPos, bestCost ]
    }

    private _calculateNodeCost (nodeIdx: number): number {
        const node = this.m_nodes[nodeIdx]
        return node.aabb.area() * node.triangleCount
    }

    private _subdivideNode (nodeIdx: number): void {
        const node = this.m_nodes[nodeIdx]
        const [ bestAxis, bestPos, bestCost ] = this._findBestSplit(nodeIdx)
        const parentCost = this._calculateNodeCost(nodeIdx)

        if (bestCost >= parentCost) {
            // Leaf node; no beneficial split
            return
        }

        const axis = bestAxis
        const splitPos = bestPos
        let i = node.leftFirst
        let j = node.leftFirst + node.triangleCount - 1

        // Partition triangles based on split
        while (i <= j) {
            const triIdx = this.m_triangleIndices[i]
            const centroid = this.m_triangles[triIdx].centroid
            if (centroid[axis] < splitPos) {
                i++
            } else {
                // Swap triangles
                const tmp = this.m_triangleIndices[i]
                this.m_triangleIndices[i] = this.m_triangleIndices[j]
                this.m_triangleIndices[j] = tmp
                j--
            }
        }

        const leftCount = i - node.leftFirst
        if (leftCount === 0 || leftCount === node.triangleCount) {
            // Failed to split; make this node a leaf
            return
        }

        // Create child nodes
        const leftChildIdx = this.m_nodeCount++
        const rightChildIdx = this.m_nodeCount++

        this.m_nodes[leftChildIdx] = {
            leftFirst: node.leftFirst,
            triangleCount: leftCount,
            aabb: new AABB(),
        }

        this.m_nodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            aabb: new AABB(),
        }

        // Update current node to internal node
        node.leftFirst = leftChildIdx // Store left child index
        node.triangleCount = 0 // Internal nodes have triangleCount = 0
        this.m_nodes[nodeIdx] = node

        // Update AABBs for child nodes
        this._updateAABB(leftChildIdx)
        this._updateAABB(rightChildIdx)

        // Recursively subdivide child nodes
        this._subdivideNode(leftChildIdx)
        this._subdivideNode(rightChildIdx)
    }

    private _updateAABB (nodeIdx: number): void {
        const node = this.m_nodes[nodeIdx]
        const nodeAABB = new AABB()

        if (node.triangleCount > 0) {
            // Leaf node
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i]
                const triangle = this.m_triangles[triIdx]
                triangle.corners.forEach(corner => nodeAABB.grow(corner))
            }
        } else {
            // Internal node
            const leftChild = this.m_nodes[node.leftFirst]
            const rightChild = this.m_nodes[node.leftFirst + 1]
            nodeAABB.growByAABB(leftChild.aabb)
            nodeAABB.growByAABB(rightChild.aabb)
        }

        node.aabb = nodeAABB
        this.m_nodes[nodeIdx] = node
    }
}