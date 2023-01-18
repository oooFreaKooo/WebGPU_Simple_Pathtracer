import { Node3d } from "./node-3d";
import { Material } from "../examples/material";

export class Object3d extends Node3d {

  _vertexBuffer: GPUBuffer
  _indexBuffer: GPUBuffer
  _normalBuffer: GPUBuffer
  bufferLayout: GPUVertexBufferLayout
  device: GPUDevice
  material: Material;

  public readonly vertexCount;
  public readonly indexCount;

  constructor(device: GPUDevice, vertices: Float32Array, normals: Float32Array, indices: Uint32Array, material: Material) {

    super();

    this.vertexCount = vertices.length / 3;
    this.indexCount = indices.length;

    const usage: GPUBufferUsageFlags =
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    this.device = device;

    const vertex_descriptor: GPUBufferDescriptor = {
      size: vertices.byteLength,
      usage: usage,
      mappedAtCreation: true
    };

    this._vertexBuffer = this.device.createBuffer(vertex_descriptor);

    // Create a new GPU buffer to store the indices
    const indexBufferDescriptor: GPUBufferDescriptor = {
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    };

    this._indexBuffer = this.device.createBuffer(indexBufferDescriptor);

    // Create new Buffer to store the normals
    const normals_descriptor: GPUBufferDescriptor = {
      size: normals.byteLength,
      usage: usage,
      mappedAtCreation: true
    };

    this._normalBuffer = this.device.createBuffer(normals_descriptor);

    //Buffer has been created, now load in the vertices and indices
    new Float32Array(this._vertexBuffer.getMappedRange()).set(vertices);
    this._vertexBuffer.unmap();

    new Float32Array(this._normalBuffer.getMappedRange()).set(normals);
    this._normalBuffer.unmap();

    new Uint32Array(this._indexBuffer.getMappedRange()).set(indices);
    this._indexBuffer.unmap();

    //now define the buffer layout
    this.bufferLayout = {
      arrayStride: 12,
      attributes: [
        {
          shaderLocation: 0,
          format: "float32x3", // float32x3 = x y z (3D), float32x2 = x y (2D)
          offset: 0
        },
        {
          shaderLocation: 1,
          format: "float32x2", // float32x3 = r g b (color) , float32x2 = u, v (textures)
          offset: 0
        },
        {
          shaderLocation: 2,
          format: "float32x3",
          offset: 0
        }
      ]

    }


    this.material = material; // assign the material to the object
  }

  get bufferlayout() {
    return this.bufferLayout;
  }

  get VertexBuffer() {
    return this._vertexBuffer;
  }

  get indexBuffer() {
    return this._indexBuffer;
  }

  get normalBuffer() {
    return this._normalBuffer;
  }
}
