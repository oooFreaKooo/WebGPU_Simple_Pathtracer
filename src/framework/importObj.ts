import { Material } from "../examples/material";
import { Object3d } from "./object-3d";
import ObjFileParser from "obj-file-parser";

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
  const _material = new Material(device);
  let offset = 0;

  // fill up the Arrays by using the "output" we just created
  for (const vertex of output.models[0].vertices) {
    _vertices.set([vertex.x, vertex.y, vertex.z], offset);
    offset += 3;
  }
  //reset offset
  offset = 0;
  for (const face of output.models[0].faces) {
    _indices.set(
      [
        face.vertices[0].vertexIndex,
        face.vertices[1].vertexIndex,
        face.vertices[2].vertexIndex,
      ],
      offset
    );
    offset += 3;
  }
  const _normals: Float32Array = new Float32Array([
    0, 0, 1, // front
    1, 0, 0, // right
    0, 0, -1, // back
    -1, 0, 0, // left
    0, 1, 0, // top
    0, -1, 0 // bottom
  ]);
  return new Object3d(device, _vertices, _normals, _indices, _material);
}
