import { vec3 } from "gl-matrix"
import { Triangle } from "./triangle"

export class Node {
  minCorner: vec3
  leftChild: number
  maxCorner: vec3
  primitiveCount: number
  constructor() {
    this.minCorner = [0, 0, 0]
    this.maxCorner = [0, 0, 0]
    this.leftChild = 0
    this.primitiveCount = 0
  }
}
