import { vec3, vec2 } from "gl-matrix"
import { Triangle } from "./triangle"
import { Node } from "./node"

export class ObjLoader {
  v: vec3[] = []
  vt: vec2[] = []
  vn: vec3[] = []
  triangles: Triangle[] = []
  color: vec3
  triangleIndices: number[] = []
  nodes: Node[] = []
  nodesUsed: number
  minCorner: vec3 = [999999, 999999, 999999]
  maxCorner: vec3 = [-999999, -999999, -999999]

  async initialize(
    color: vec3,
    url: string,
  ): Promise<{
    triangles: Triangle[]
    nodes: Node[]
    triangleIndices: number[]
    vertices: vec3[]
    textureCoords: vec2[]
    vertexNormals: vec3[]
    minCorner: vec3
    maxCorner: vec3
  }> {
    this.color = color
    await this.readFile(url)
    this.buildBVH()
    return {
      triangles: this.triangles,
      nodes: this.nodes,
      triangleIndices: this.triangleIndices,
      vertices: this.v,
      textureCoords: this.vt,
      vertexNormals: this.vn,
      minCorner: this.minCorner,
      maxCorner: this.maxCorner,
    }
  }

  async readFile(url: string) {
    const response = await fetch(url)
    const file_contents = await response.text()

    let line = ""
    for (let i = 0; i < file_contents.length; i++) {
      if (file_contents[i] === "\n" || i === file_contents.length - 1) {
        const prefix = line.slice(0, 2)
        switch (prefix) {
          case "v ":
            this.read_vertex_data(line)
            break
          case "vt":
            this.read_texcoord_data(line)
            break
          case "vn":
            this.read_normal_data(line)
            break
          case "f ":
            this.read_face_data(line)
            break
        }
        line = ""
      } else {
        line += file_contents[i]
      }
    }
  }

  read_vertex_data(line: string) {
    const [, x, y, z] = line.split(" ").map(Number)
    const new_vertex: vec3 = [x, y, z]
    this.v.push(new_vertex)
    vec3.min(this.minCorner, this.minCorner, new_vertex)
    vec3.max(this.maxCorner, this.maxCorner, new_vertex)
  }

  read_texcoord_data(line: string) {
    const [, u, v] = line.split(" ").map(Number)
    this.vt.push([u, v])
  }

  read_normal_data(line: string) {
    const [, nx, ny, nz] = line.split(" ").map(Number)
    this.vn.push([nx, ny, nz])
  }

  read_face_data(line: string) {
    const vertex_descriptions = line.split(" ")
    const triangle_count = vertex_descriptions.length - 3
    for (let i = 0; i < triangle_count; i++) {
      const tri = new Triangle()
      this.read_corner(vertex_descriptions[1], tri)
      this.read_corner(vertex_descriptions[2 + i], tri)
      this.read_corner(vertex_descriptions[3 + i], tri)
      tri.color = this.color
      tri.make_centroid()
      this.triangles.push(tri)
    }
  }

  read_corner(vertex_description: string, tri: Triangle) {
    const [vIndex, vtIndex, vnIndex] = vertex_description.split("/").map(Number)
    tri.corners.push(this.v[vIndex - 1])
    tri.normals.push(this.vn[vnIndex - 1])
  }

  buildBVH() {
    this.triangleIndices = Array.from({ length: this.triangles.length }, (_, i) => i)
    this.nodes = Array.from({ length: 2 * this.triangles.length - 1 }, () => new Node())
    const root = this.nodes[0]
    root.leftChild = 0
    root.primitiveCount = this.triangles.length
    this.nodesUsed = 1
    this.updateBounds(0)
    this.subdivide(0)
  }

  updateBounds(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    node.minCorner = [999999, 999999, 999999]
    node.maxCorner = [-999999, -999999, -999999]
    for (let i = 0; i < node.primitiveCount; i++) {
      const triangle = this.triangles[this.triangleIndices[node.leftChild + i]]
      triangle.corners.forEach((corner) => {
        vec3.min(node.minCorner, node.minCorner, corner)
        vec3.max(node.maxCorner, node.maxCorner, corner)
      })
    }
  }

  subdivide(nodeIndex: number) {
    const node = this.nodes[nodeIndex]
    if (node.primitiveCount < 2) return
    const extent = vec3.subtract(vec3.create(), node.maxCorner, node.minCorner)
    const axis = extent.indexOf(Math.max(...extent))
    const splitPosition = node.minCorner[axis] + extent[axis] / 2
    let i = node.leftChild
    let j = i + node.primitiveCount - 1
    while (i <= j) {
      if (this.triangles[this.triangleIndices[i]].centroid[axis] < splitPosition) {
        i++
      } else {
        ;[this.triangleIndices[i], this.triangleIndices[j]] = [this.triangleIndices[j], this.triangleIndices[i]]
        j--
      }
    }
    const leftCount = i - node.leftChild
    if (leftCount === 0 || leftCount === node.primitiveCount) return
    const leftChildIndex = this.nodesUsed++
    const rightChildIndex = this.nodesUsed++
    this.nodes[leftChildIndex].leftChild = node.leftChild
    this.nodes[leftChildIndex].primitiveCount = leftCount
    this.nodes[rightChildIndex].leftChild = i
    this.nodes[rightChildIndex].primitiveCount = node.primitiveCount - leftCount
    node.leftChild = leftChildIndex
    node.primitiveCount = 0
    this.updateBounds(leftChildIndex)
    this.updateBounds(rightChildIndex)
    this.subdivide(leftChildIndex)
    this.subdivide(rightChildIndex)
  }
}
