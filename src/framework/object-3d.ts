import {Node3d} from "./node-3d";
import {Material} from "../examples/material";

export class Object3d extends Node3d {

    buffer: GPUBuffer
    indexBuffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout
    device: GPUDevice
    material: Material;

    constructor(device: GPUDevice, vertices:Float32Array, indices:Float32Array, material: Material) {

        super();

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        this.device = device;

        const descriptor: GPUBufferDescriptor = {
            size: vertices.byteLength,
            usage: usage,
            mappedAtCreation: true 
        };

        this.buffer = this.device.createBuffer(descriptor);

        // Create a new GPU buffer to store the indices
        const indexBufferDescriptor: GPUBufferDescriptor = {
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
      };

        this.indexBuffer = this.device.createBuffer(indexBufferDescriptor);

        //Buffer has been created, now load in the vertices and indices
        new Float32Array(this.buffer.getMappedRange()).set(vertices);
        this.buffer.unmap();

        new Float32Array(this.indexBuffer.getMappedRange()).set(indices);
        this.indexBuffer.unmap();
        
        //now define the buffer layout
        this.bufferLayout = {
            arrayStride: 20,
            attributes: [
                {
                    shaderLocation: 0,
                    format: "float32x3", // float32x3 = x y z (3D), float32x2 = x y (2D)
                    offset: 0
                },
                {
                    shaderLocation: 1,
                    format: "float32x2", // float32x3 = r g b (color) , float32x2 = u, v (textures)
                    offset: 12
                }
            ]
        }

        this.material = material; // assign the material to the object

    }

    get bufferlayout() {
        return this.bufferLayout;
    }

}