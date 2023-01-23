import { Material } from "../examples/material";
import { Object3d } from "./object-3d";
import ObjFileParser from "obj-file-parser";
import { vec3 } from "gl-matrix";

export async function parseOBJ(device: GPUDevice, file: string) {
  // fetch the contents of the file
  const fileContents = await fetch(file).then((response) => response.text());
  // parse the contents of the file
  const obj = new ObjFileParser(fileContents);
  const output = obj.parse();
  if (output.models[0] === undefined) {
    throw new Error("No models found in the OBJ file");
  }
  // setup vertices, indices and material for Object 3d
  const _vertices = new Float32Array(output.models[0].vertices.length * 3);
  const _indices = new Uint32Array(output.models[0].faces.length * 3);
  const _normals = new Float32Array(output.models[0].vertexNormals.length * 3);
  const _material = new Material(device);
  const _textureCoords = new Float32Array(output.models[0].textureCoords.length * 2);
  let offset = 0;

  // fill up the Arrays by using the "output" we just created
  for (const vertex of output.models[0].vertices) {
    _vertices.set([vertex.x, vertex.y, vertex.z], offset);
    offset += 3;
  }
  //reset offset
  offset = 0;
  for (const normal of output.models[0].vertexNormals) {
    _normals.set([normal.x, normal.y, normal.z], offset);
    offset += 3;
  }
  //reset offset
  offset = 0;
  for (const face of output.models[0].faces) {
    _indices.set([face.vertices[0].vertexIndex - 1, face.vertices[1].vertexIndex - 1, face.vertices[2].vertexIndex - 1], offset);
    offset += 3;
  }
  offset = 0;
  for (const texCoord of output.models[0].textureCoords) {
    _textureCoords.set([texCoord.u, texCoord.v], offset);
    offset += 2;
  }

  const numberOfObjects = 1;

  _material.setObject(numberOfObjects);
  _material.setLight();
  await _material.setTexture(device, "spidertx.png", true);

  return new Object3d(device, _vertices, _normals, _indices, _material, _textureCoords);
}
