import { Material } from "../examples/material"
import { Object3d } from "./object-3d"
import ObjFileParser from "obj-file-parser"

export async function parseOBJ(device: GPUDevice, file: string, texturePath: string) {
  // fetch the contents of the file
  const fileContents = await fetch(file).then((response) => response.text())
  // parse the contents of the file
  const obj = new ObjFileParser(fileContents)
  const output = obj.parse()
  if (output.models.length === 0) {
    throw new Error("No models found in the OBJ file")
  }

  // create an array to store all the objects
  const objects = []
  for (const model of output.models) {
    // setup vertices, indices, normals, and UV data for Object 3d
    const _vertices = new Float32Array(model.vertices.length * 3)
    const _indices = new Uint32Array(model.faces.length * 3)
    const _normals = new Float32Array(model.vertexNormals.length * 3)
    const _uvData = new Float32Array(model.textureCoords.length * 2)

    let offset = 0

    // fill up the arrays by using the "model" data
    for (const vertex of model.vertices) {
      _vertices.set([vertex.x, vertex.y, vertex.z], offset)
      offset += 3
    }
    offset = 0
    for (const normal of model.vertexNormals) {
      _normals.set([normal.x, normal.y, normal.z], offset)
      offset += 3
    }
    offset = 0
    for (const face of model.faces) {
      _indices.set([face.vertices[0].vertexIndex - 1, face.vertices[1].vertexIndex - 1, face.vertices[2].vertexIndex - 1], offset)
      offset += 3
    }
    offset = 0
    for (const texCoord of model.textureCoords) {
      _uvData.set([texCoord.u, texCoord.v], offset)
      offset += 2
    }

    const _material = new Material(device)
    _material.setLight()
    await _material.setTexture(texturePath)

    // create a new Object3d instance and push it to the objects array
    objects.push(new Object3d(device, _vertices, _normals, _indices, _material, _uvData))
  }

  return objects
}
