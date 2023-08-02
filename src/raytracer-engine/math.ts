import { vec3 } from "gl-matrix"
import { Triangle } from "./triangle"

export function deg2Rad(theta: number) {
  return (theta * Math.PI) / 180.0
}

export function getTriangleCenter(triangle: Triangle): vec3 {
  return [
    (triangle.corners[0][0] + triangle.corners[1][0] + triangle.corners[2][0]) / 3,
    (triangle.corners[0][1] + triangle.corners[1][1] + triangle.corners[2][1]) / 3,
    (triangle.corners[0][2] + triangle.corners[1][2] + triangle.corners[2][2]) / 3,
  ]
}
