import { Material } from "../examples/material";
import { Object3d } from "./object-3d";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export const loadFBX = async (filepath: string, device: GPUDevice): Promise<Object3d> => {
  const loader = new FBXLoader();
  const _material = new Material(device);
  _material.setObject(1);
  _material.setLight();
  await _material.setTexture(device, "leo.jpg", true);

  return new Promise((resolve, reject) => {
    loader.load(
      filepath,
      (object) => {
        const model = object.children[0];
        const geometry = (model as any).geometry;
        if (!geometry) {
          console.log("FBXLoader: No geometry found");
          return reject();
        }
        const { position, normal, uv } = geometry.attributes;
        const _vertices = position?.array ?? new Float32Array();
        const _normals = normal?.array ?? new Float32Array();
        const _indices = geometry.index?.array ?? new Uint32Array();
        const _textureCoords = uv?.array ?? new Float32Array();
        resolve(new Object3d(device, _vertices, _normals, _indices, _material, _textureCoords));
      },
      undefined,
      reject
    );
  });
};
