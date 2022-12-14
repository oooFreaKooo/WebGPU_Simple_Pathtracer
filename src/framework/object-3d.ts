import {Node3d} from "./node-3d";

export class Object3d extends Node3d {

    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout
    device: GPUDevice;

   /* _vertices: Float32Array = new Float32Array([
        -1, -1,  1,     // vertex a, index 0
         1, -1,  1,     // vertex b, index 1
         1,  1,  1,     // vertex c, index 2
        -1,  1,  1,     // vertex d, index 3
        -1, -1, -1,     // vertex e, index 4
         1, -1, -1,     // vertex f, index 5
         1,  1, -1,     // vertex g, index 6
        -1,  1, -1,     // vertex h, index 7 
    ]);
    _indices: Float32Array = new Float32Array([
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

    _colors: Float32Array = new Float32Array([
      0, 0, 1,     
      1, 0, 1,     
      1, 1, 1,     
      0, 1, 1,     
      0, 0, 0,    
      1, 0, 0,   
      1, 1, 0,    
      0, 1, 0,     
 ]);*/
  

    constructor(device: GPUDevice, vertices:Float32Array, indices:Float32Array, colors:Float32Array) {

        super();

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        //VERTEX: the buffer can be used as a vertex buffer
        //COPY_DST: data can be copied to the buffer

        this.device = device;

        //TODO
        //Weitere Buffer für indices | danach in render-element
        //Material zuweisen
        const descriptor: GPUBufferDescriptor = {
            size: vertices.byteLength,
            usage: usage,
            mappedAtCreation: true // similar to HOST_VISIBLE, allows buffer to be written by the CPU
        };

        this.buffer = this.device.createBuffer(descriptor);

        //Buffer has been created, now load in the vertices
        new Float32Array(this.buffer.getMappedRange()).set(vertices);
        this.buffer.unmap();

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

    }

    get bufferlayout() {
        return this.bufferLayout;
    }

}