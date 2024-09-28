import { vec2, vec3 } from "gl-matrix"

export class Triangle {
  centroid: vec3
  corners: vec3[]
  normals: vec3[]

  constructor() {
    this.corners = []
    this.normals = []
  }

  make_centroid(): void {
    const c0 = this.corners[0];
    const c1 = this.corners[1];
    const c2 = this.corners[2];

    this.centroid = vec3.fromValues(
      (c0[0] + c1[0] + c2[0]) / 3,
      (c0[1] + c1[1] + c2[1]) / 3,
      (c0[2] + c1[2] + c2[2]) / 3
    );
  }
}
