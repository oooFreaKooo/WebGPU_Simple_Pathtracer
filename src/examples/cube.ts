import { Object3d } from "../framework/object-3d";
import { Material } from "./material";

export function makeCube(device: GPUDevice) {

    const _vertices: Float32Array = new Float32Array([
        // 0.0, 0.5, 0.0,
        // -0.5, -0.5, 0.0,
        // 0.5, -0.5, 0.0,
        -1, -1, 1,     // vertex a, index 0
        1, -1, 1,     // vertex b, index 1
        1, 1, 1,     // vertex c, index 2
        -1, 1, 1,     // vertex d, index 3
        -1, -1, -1,     // vertex e, index 4
        1, -1, -1,     // vertex f, index 5
        1, 1, -1,     // vertex g, index 6
        -1, 1, -1,     // vertex h, index 7 
    ]);
    const _indices = new Uint32Array([
        // front
        0, 1, 2, 2, 3, 0,

        // right
        1, 5, 6, 6, 2, 1,

        // back
        4, 7, 6, 6, 5, 4,

        // left
        0, 3, 7, 7, 4, 0,

        // top
        3, 2, 6, 6, 7, 3,

        // bottom
        0, 4, 5, 5, 1, 0
    ]);

    const _material: Material = new Material(device);
    //_material.setColor(new Float32Array([0, 0, 1, 0]));

    return new Object3d(device, _vertices, _indices, _material);

}