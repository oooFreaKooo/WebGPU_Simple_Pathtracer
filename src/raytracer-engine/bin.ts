import { vec3 } from "gl-matrix"
import { Triangle } from "./triangle"

export class Bin {
  minCorner: vec3
  maxCorner: vec3
  count: number

  constructor() {
    this.minCorner = [999999, 999999, 999999]
    this.maxCorner = [-999999, -999999, -999999]
    this.count = 0
  }

  // Update the bin's AABB and count with a new triangle
  addTriangle(triangle: Triangle) {
    triangle.corners.forEach((corner: vec3) => {
      this.minCorner[0] = Math.min(this.minCorner[0], corner[0])
      this.minCorner[1] = Math.min(this.minCorner[1], corner[1])
      this.minCorner[2] = Math.min(this.minCorner[2], corner[2])

      this.maxCorner[0] = Math.max(this.maxCorner[0], corner[0])
      this.maxCorner[1] = Math.max(this.maxCorner[1], corner[1])
      this.maxCorner[2] = Math.max(this.maxCorner[2], corner[2])
    })
    this.count++
  }

  // Compute the surface area of the bin's AABB
  surfaceArea(): number {
    const dx = this.maxCorner[0] - this.minCorner[0]
    const dy = this.maxCorner[1] - this.minCorner[1]
    const dz = this.maxCorner[2] - this.minCorner[2]
    return 2 * (dx * dy + dx * dz + dy * dz)
  }

  // Reset the bin to its initial state
  reset() {
    this.minCorner = [999999, 999999, 999999]
    this.maxCorner = [-999999, -999999, -999999]
    this.count = 0
  }
}
