import { vec3 } from "gl-matrix"
import { Triangle } from "./triangle"

export class Node {
  aabbMin: vec3
  leftFirst: number
  aabbMax: vec3
  triCount: number
  constructor() {
    this.aabbMin = [0, 0, 0]
    this.aabbMax = [0, 0, 0]
    this.leftFirst = 0
    this.triCount = 0
  }
}

export class AABB {
  bmin: vec3 = vec3.fromValues(Infinity, Infinity, Infinity)
  bmax: vec3 = vec3.fromValues(-Infinity, -Infinity, -Infinity)

  grow(p: vec3): void {
    vec3.min(this.bmin, this.bmin, p)
    vec3.max(this.bmax, this.bmax, p)
  }

  growByAABB(aabb: AABB): void {
    vec3.min(this.bmin, this.bmin, aabb.bmin)
    vec3.max(this.bmax, this.bmax, aabb.bmax)
  }

  area(): number {
    const e = vec3.create()
    vec3.subtract(e, this.bmax, this.bmin)
    return e[0] * e[1] + e[1] * e[2] + e[2] * e[0]
  }
}

export class Bin {
  bounds: AABB = new AABB()
  triCount: number = 0
}
