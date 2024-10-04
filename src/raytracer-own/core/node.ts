import { mat4, vec3 } from 'gl-matrix'

export class AABB {
    bmax: vec3
    bmin: vec3

    constructor (
        bmax: vec3 = vec3.fromValues(-Infinity, -Infinity, -Infinity),
        bmin: vec3 = vec3.fromValues(Infinity, Infinity, Infinity)
    ) {
        this.bmax = bmax
        this.bmin = bmin
    }

    clone (): AABB {
        return new AABB(vec3.clone(this.bmax), vec3.clone(this.bmin))
    }

    area (): number {
        const e = vec3.create()
        vec3.subtract(e, this.bmax, this.bmin)
        return e[0] * e[1] + e[1] * e[2] + e[2] * e[0]
    }

    grow (p: vec3): void {
        vec3.min(this.bmin, this.bmin, p)
        vec3.max(this.bmax, this.bmax, p)
    }

    growByAABB (aabb: AABB): void {
        vec3.min(this.bmin, this.bmin, aabb.bmin)
        vec3.max(this.bmax, this.bmax, aabb.bmax)
    }

    applyMatrix4 (matrix: mat4): void {
    // Transform the AABB by a matrix by transforming all 8 corners
        const points = [
            vec3.fromValues(this.bmin[0], this.bmin[1], this.bmin[2]),
            vec3.fromValues(this.bmin[0], this.bmin[1], this.bmax[2]),
            vec3.fromValues(this.bmin[0], this.bmax[1], this.bmin[2]),
            vec3.fromValues(this.bmin[0], this.bmax[1], this.bmax[2]),
            vec3.fromValues(this.bmax[0], this.bmin[1], this.bmin[2]),
            vec3.fromValues(this.bmax[0], this.bmin[1], this.bmax[2]),
            vec3.fromValues(this.bmax[0], this.bmax[1], this.bmin[2]),
            vec3.fromValues(this.bmax[0], this.bmax[1], this.bmax[2]),
        ]

        const newMin = vec3.fromValues(Infinity, Infinity, Infinity)
        const newMax = vec3.fromValues(-Infinity, -Infinity, -Infinity)

        for (const point of points) {
            const transformedPoint = vec3.transformMat4(vec3.create(), point, matrix)
            vec3.min(newMin, newMin, transformedPoint)
            vec3.max(newMax, newMax, transformedPoint)
        }

        this.bmin = newMin
        this.bmax = newMax
    }
}

export class Bin {
    bounds: AABB = new AABB()
    triCount: number = 0
}
