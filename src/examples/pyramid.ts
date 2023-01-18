import { Object3d } from "../framework/object-3d";
import { Material } from "./material";

export function makePyramid(device: GPUDevice) {

    const _vertices: Float32Array = new Float32Array([
        -1, -1, 1,     // vertex a, index 0
        1, -1, 1,      // vertex b index 1
        -1, -1, -1,    // vertex c index 2
        1, -1, -1,     // vertex d, index 3
        0, 0, 0,       // vertex e, index 5
    ]);
    const _indices = new Uint32Array([
        // bottom
        0, 2, 3, 3, 1, 0,

        // front
        4, 0, 1,

        // back
        4, 2, 3,

        // left
        4, 3, 0,

        // right
        4, 1, 2,



    ]);

    const _material: Material = new Material(device);
    _material.setColor(new Float32Array([0, 0, 1, 1]));
    const _normals: Float32Array = new Float32Array([
        0, 1, 1, // front
        1, 1, 0, // right
        0, 1, -1, // back
        -1, 1, 0, // left
        0, -1, 0 // bottom
    ]);
    return new Object3d(device, _vertices, _normals, _indices, _material);

}