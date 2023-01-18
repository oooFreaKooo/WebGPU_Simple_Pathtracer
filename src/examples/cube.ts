import { Object3d } from "../framework/object-3d";
import { Material } from "./material";

export function makeCube(device: GPUDevice) {

    const _vertices: Float32Array = new Float32Array([
        // pos        // color
        -1, -1, 1,    1, 1, 0,    // vertex a, index 0
        1, -1, 1,     1, 0, 1,   // vertex b, index 1
        1, 1, 1,      1, 1, 1, // vertex c, index 2
        -1, 1, 1,     0, 1, 1, // vertex d, index 3
        -1, -1, -1,   0, 0, 0, // vertex e, index 4
        1, -1, -1,    1, 0, 0, // vertex f, index 5
        1, 1, -1,     1, 1, 0, // vertex g, index 6
        -1, 1, -1,    0, 1, 0, // vertex h, index 7 
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

    const _normals: Float32Array = new Float32Array([
        0, 0 ,1, // front
        1, 0, 0, // right
        0, 0, -1, // back
        -1, 0, 0, // left
        0, 1, 0, // top
        0, -1, 0 // bottom
    ]);

    const _material: Material = new Material(device);
    _material.setColor(new Float32Array([1, 1, 0,
        1, 0, 1,
        1, 1, 1,
        0, 1, 1,
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,]));



    // Other Set of Vertices, Indices and Color

    const _newVertices = new Float32Array([
        // front
        -1, -1,  1,  0, 0, 1,
         1, -1,  1,  0, 0, 1,
         1,  1,  1,  0, 0, 1,
         1,  1,  1,  0, 0, 1,
        -1,  1,  1,  0, 0, 1,
        -1, -1,  1,  0, 0, 1,

        // right
         1, -1,  1,  1, 0, 0,
         1, -1, -1,  1, 0, 0,
         1,  1, -1,  1, 0, 0,
         1,  1, -1,  1, 0, 0,
         1,  1,  1,  1, 0, 0,
         1, -1,  1,  1, 0, 0,

        // back
        -1, -1, -1,  1, 1, 0,
        -1,  1, -1,  1, 1, 0,
         1,  1, -1,  1, 1, 0,
         1,  1, -1,  1, 1, 0,
         1, -1, -1,  1, 1, 0,
        -1, -1, -1,  1, 1, 0,

        // left
        -1, -1,  1,   0, 1, 1,
        -1,  1,  1,  0, 1, 1,
        -1,  1, -1,  0, 1, 1,
        -1,  1, -1,  0, 1, 1,
        -1, -1, -1,  0, 1, 1,
        -1, -1,  1,  0, 1, 1,

        // top
        -1,  1,  1,  0, 1, 0,
         1,  1,  1,  0, 1, 0,
         1,  1, -1,  0, 1, 0,
         1,  1, -1,  0, 1, 0,
        -1,  1, -1,  0, 1, 0,
        -1,  1,  1,  0, 1, 0,

        // bottom
        -1, -1,  1,  1, 0, 1,
        -1, -1, -1,  1, 0, 1,
         1, -1, -1,  1, 0, 1,
         1, -1, -1,  1, 0, 1,
         1, -1,  1,  1, 0, 1,
        -1, -1,  1,  1, 0, 1
    ]);
    const _newColors = new Float32Array([
        // front - blue
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // right - red
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //back - yellow
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,

        //left - aqua
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,

        // top - green
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // bottom - fuchsia
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1
    ]);

    const _newNormals = new Float32Array([
        // front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

        // right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

        // back           
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

        // left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

        // top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

        // bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0
    ]);

    // ToDo: Indices löschen

    return new Object3d(device, _newVertices, _newNormals,_indices, _material);

}