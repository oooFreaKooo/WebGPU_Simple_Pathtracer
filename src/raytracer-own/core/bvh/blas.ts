import { Triangle } from '../triangle'
import { AABB } from '../node'

export interface BLASNode {
    leftFirst: number
    triangleCount: number
    aabb: AABB
}

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

        // Use a stack to manage node subdivision iteratively
        const stack: number[] = [ this.m_rootNodeIdx ]

        while (stack.length > 0) {
            const currentNodeIdx = stack.pop()!
            const currentNode = this.m_nodes[currentNodeIdx]

            const parentCost = this._calculateNodeCost(currentNodeIdx)
            const [ bestAxis, bestPos, bestCost ] = this._findBestSplit(currentNodeIdx)

            if (bestCost >= parentCost) {
                // Leaf node; no beneficial split
                continue
            }

            const axis = bestAxis
            const splitPos = bestPos
            let i = currentNode.leftFirst
            let j = currentNode.leftFirst + currentNode.triangleCount - 1

            // Partition triangles based on split
            while (i <= j) {
                const triIdx = this.m_triangleIndices[i]
                const centroid = this.m_triangles[triIdx].centroid[axis]
                if (centroid < splitPos) {
                    i++
                } else {
                    // Swap triangles
                    const tmp = this.m_triangleIndices[i]
                    this.m_triangleIndices[i] = this.m_triangleIndices[j]
                    this.m_triangleIndices[j] = tmp
                    j--
                }
            }

            const leftCount = i - currentNode.leftFirst
            if (leftCount === 0 || leftCount === currentNode.triangleCount) {
                // Failed to split; make this node a leaf
                continue
            }

            // Create child nodes
            const leftChildIdx = this.m_nodeCount++
            const rightChildIdx = this.m_nodeCount++

            this.m_nodes[leftChildIdx] = {
                leftFirst: currentNode.leftFirst,
                triangleCount: leftCount,
                aabb: new AABB(),
            }

            this.m_nodes[rightChildIdx] = {
                leftFirst: i,
                triangleCount: currentNode.triangleCount - leftCount,
                aabb: new AABB(),
            }

            // Update current node to internal node
            currentNode.leftFirst = leftChildIdx // Store left child index
            currentNode.triangleCount = 0 // Internal nodes have triangleCount = 0
            this.m_nodes[currentNodeIdx] = currentNode

            // Update AABBs for child nodes
            this._updateAABB(leftChildIdx)
            this._updateAABB(rightChildIdx)

            // Push child nodes to the stack for further subdivision
            stack.push(leftChildIdx, rightChildIdx)
        }

        // Trim unused nodes
        this.m_nodes.length = this.m_nodeCount
    }

    private _findBestSplit (nodeIdx: number): [number, number, number] {
        const node = this.m_nodes[nodeIdx]
        let bestAxis = -1
        let bestPos = 0
        let bestCost = Number.MAX_VALUE

        const centroidMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ]
        const centroidMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ]

        // Compute bounds of centroids
        for (let i = 0; i < node.triangleCount; i++) {
            const triIdx = this.m_triangleIndices[node.leftFirst + i]
            const centroid = this.m_triangles[triIdx].centroid
            for (let axis = 0; axis < 3; axis++) {
                if (centroid[axis] < centroidMin[axis]) {centroidMin[axis] = centroid[axis]}
                if (centroid[axis] > centroidMax[axis]) {centroidMax[axis] = centroid[axis]}
            }
        }

        for (let axis = 0; axis < 3; axis++) {
            const min = centroidMin[axis]
            const max = centroidMax[axis]

            if (min === max) {continue} // All centroids are on the same position on this axis

            const maxBins = 8
            const binCount = Math.min(maxBins, node.triangleCount)
            const scale = binCount / (max - min)
            const bins: { aabb: AABB; count: number }[] = Array.from({ length: binCount }, () => ({
                aabb: new AABB(),
                count: 0,
            }))

            // Distribute triangles into bins
            for (let i = 0; i < node.triangleCount; i++) {
                const triIdx = this.m_triangleIndices[node.leftFirst + i]
                const centroid = this.m_triangles[triIdx].centroid[axis]
                const binIdx = Math.min(binCount - 1, Math.floor((centroid - min) * scale))
                const bin = bins[binIdx]
                bin.count++
                this.m_triangles[triIdx].corners.forEach(corner => bin.aabb.grow(corner))
            }

            // Compute prefix sums for left and right splits
            const leftCounts: number[] = new Array(binCount - 1)
            const rightCounts: number[] = new Array(binCount - 1)
            const leftAreas: number[] = new Array(binCount - 1)
            const rightAreas: number[] = new Array(binCount - 1)

            const leftAABBs: AABB[] = []
            const rightAABBs: AABB[] = []

            // Left to right
            const leftAABB = new AABB()
            let leftCount = 0
            for (let i = 0; i < binCount - 1; i++) {
                leftCount += bins[i].count
                leftCounts[i] = leftCount
                leftAABB.growByAABB(bins[i].aabb)
                leftAreas[i] = leftAABB.area()
                leftAABBs[i] = leftAABB.clone()
            }

            // Right to left
            const rightAABB = new AABB()
            let rightCount = 0
            for (let i = binCount - 1; i > 0; i--) {
                rightCount += bins[i].count
                rightCounts[i - 1] = rightCount
                rightAABB.growByAABB(bins[i].aabb)
                rightAreas[i - 1] = rightAABB.area()
                rightAABBs[i - 1] = rightAABB.clone()
            }

            const binWidth = (max - min) / binCount

            // Evaluate split cost using Surface Area Heuristic (SAH)
            for (let i = 0; i < binCount - 1; i++) {
                const countLeft = leftCounts[i]
                const countRight = rightCounts[i]
                if (countLeft === 0 || countRight === 0) {continue}

                const cost = leftAreas[i] * countLeft + rightAreas[i] * countRight

                if (cost < bestCost) {
                    bestAxis = axis
                    bestPos = min + binWidth * (i + 1)
                    bestCost = cost
                }
            }
        }

        // If no valid split found, return default values
        if (bestAxis === -1) {
            return [ -1, 0, Number.MAX_VALUE ]
        }

        return [ bestAxis, bestPos, bestCost ]
    }

    private _calculateNodeCost (nodeIdx: number): number {
        const node = this.m_nodes[nodeIdx]
        return node.aabb.area() * node.triangleCount
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
