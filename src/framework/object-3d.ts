import { Node3d } from "./node-3d";
import { Material } from "../examples/material";

export class Object3d extends Node3d {
  _vertexBuffer: GPUBuffer;
  _indexBuffer: GPUBuffer;
  _normalBuffer: GPUBuffer;
  _textureBuffer: GPUBuffer;
  bufferLayout: GPUVertexBufferLayout;
  device: GPUDevice;
  material: Material;

  public readonly vertexCount;
  public readonly indexCount;

  constructor(
    device: GPUDevice,
    vertices: Float32Array,
    normals: Float32Array,
    indices: Uint32Array,
    material: Material,
    texture?: Float32Array
  ) {
    super();
    this.vertexCount = vertices.length / 3;
    this.indexCount = indices.length;

    const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
    this.device = device;

    const descriptor: GPUBufferDescriptor = {
      size: vertices.byteLength,
      usage: usage,
      mappedAtCreation: true,
    };

    // Create a new GPU buffer to store the indices
    const indexBufferDescriptor: GPUBufferDescriptor = {
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    };

    // Create new Buffer to store the normals
    const normals_descriptor: GPUBufferDescriptor = {
      size: normals.byteLength,
      usage: usage,
      mappedAtCreation: true,
    };

    this._vertexBuffer = this.device.createBuffer(descriptor);
    this._indexBuffer = this.device.createBuffer(indexBufferDescriptor);
    this._normalBuffer = this.device.createBuffer(normals_descriptor);

    //Buffer has been created, now load in the vertices and indices
    new Float32Array(this._vertexBuffer.getMappedRange()).set(vertices);
    this._vertexBuffer.unmap();

    new Uint32Array(this._indexBuffer.getMappedRange()).set(indices);
    this._indexBuffer.unmap();

    new Float32Array(this._normalBuffer.getMappedRange()).set(normals);
    this._normalBuffer.unmap();

    if (texture) {
      // Check if texture was provided
      const textureBufferDescriptor: GPUBufferDescriptor = {
        size: texture.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      };

      this._textureBuffer = this.device.createBuffer(textureBufferDescriptor);
      new Float32Array(this._textureBuffer.getMappedRange()).set(texture);
      this._textureBuffer.unmap();

      this.bufferLayout = {
        arrayStride: 12, // 3 position 2 uv,
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3",
          },
          {
            // normal
            shaderLocation: 1,
            offset: 0,
            format: "float32x3",
          },
          {
            // uv
            shaderLocation: 2,
            offset: 0,
            format: "float32x2",
          },
        ],
      };
    } else {
      this.bufferLayout = {
        arrayStride: 12, // 3 position 2 uv,
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0,
            format: "float32x3",
          },
          {
            // normal
            shaderLocation: 1,
            offset: 0,
            format: "float32x3",
          },
        ],
      };
    }
    this.material = material;
  }

  get TextureBuffer() {
    if (this._textureBuffer) {
      return this._textureBuffer;
    } else {
      return null;
    }
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
