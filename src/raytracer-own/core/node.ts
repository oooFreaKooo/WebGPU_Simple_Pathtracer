import { vec3 } from "gl-matrix"

export class Node {
  aabbMax: vec3
  aabbMin: vec3
  leftFirst: number
  triCount: number
  constructor() {
    this.aabbMin = [0, 0, 0]
    this.aabbMax = [0, 0, 0]
    this.leftFirst = 0
    this.triCount = 0
  }
}

export class AABB {
  bmax: vec3
  bmin: vec3

  constructor(
    bmax: vec3 = vec3.fromValues(-Infinity, -Infinity, -Infinity),
    bmin: vec3 = vec3.fromValues(Infinity, Infinity, Infinity)
  ) {
    this.bmax = bmax
    this.bmin = bmin
  }
  area(): number {
    const e = vec3.create()
    vec3.subtract(e, this.bmax, this.bmin)
    return e[0] * e[1] + e[1] * e[2] + e[2] * e[0]
  }

  grow(p: vec3): void {
    vec3.min(this.bmin, this.bmin, p)
    vec3.max(this.bmax, this.bmax, p)
  }

  growByAABB(aabb: AABB): void {
    vec3.min(this.bmin, this.bmin, aabb.bmin)
    vec3.max(this.bmax, this.bmax, aabb.bmax)
  }
}

export class Bin {
  bounds: AABB = new AABB()
  triCount: number = 0
}
