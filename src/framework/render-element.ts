import { mat4, vec3 } from "gl-matrix";
import { Object3d } from "./object-3d";
import { Material } from "../examples/material";

export class RenderElement {
  //Device/Context objects
  public device: GPUDevice;
  public format: GPUTextureFormat;

  // Pipeline objects
  public pipeline: GPURenderPipeline;
  public lightBindGroup: GPUBindGroup;
  public lightPosBindGroup: GPUBindGroup;
  public vertexBindGroup: GPUBindGroup;
  public transformBuffer: GPUBuffer;

  public readonly vertexCount;
  public readonly indexCount;

  // Assets
  object3D: Object3d;

  constructor(format: GPUTextureFormat, object: Object3d, public camera: mat4) {
    this.device = object.device;
    this.format = format;
    this.object3D = object;
    this.makePipeline();
    this.vertexCount = object.vertexCount;
    this.indexCount = object.indexCount;
  }

  // create pipeline
  public async makePipeline() {
    const material = new Material(this.device);
    const transformUniform: mat4 = mat4.create();
    mat4.multiply(transformUniform, this.camera, this.object3D.calcWorldTransMatrix());
    const materialUniform = this.object3D.material;

    this.transformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform);

    this.pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        //material.vertex
        module: material.vertexShader,
        entryPoint: "vs_main",
        buffers: [this.object3D.bufferLayout],
      },

      fragment: {
        //material.fragment
        module: material.fragmentShader,
        entryPoint: "fs_main",
        targets: [
          {
            format: this.format as GPUTextureFormat,
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    this.vertexBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: materialUniform.modelViewBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.transformBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: materialUniform.colorBuffer1,
          },
        },
        {
          binding: 3,
          resource: materialUniform.view,
        },
        {
          binding: 4,
          resource: materialUniform.sampler,
        },
        /*         {
          binding: 3,
          resource: {
            buffer: materialUniform.shadowMatrixBuffer,
          },
        }, */
      ],
    });
    this.lightBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: materialUniform.ambientBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: materialUniform.pointBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: materialUniform.directionalBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: materialUniform.hasTextureBuffer,
          },
        },
      ],
    });
  }
}
