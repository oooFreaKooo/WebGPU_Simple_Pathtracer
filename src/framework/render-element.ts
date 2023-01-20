import { mat4, vec3 } from "gl-matrix";
import { Object3d } from "./object-3d";
import { Material } from "../examples/material";

export class RenderElement {
  //Device/Context objects
  public device: GPUDevice;
  public format: GPUTextureFormat;

  // Pipeline objects
  public transformBuffer: GPUBuffer;
  public lightPosBuffer: GPUBuffer;
  public pipeline: GPURenderPipeline;

  public transformBindGroup: GPUBindGroup;
  public lightBindGroup: GPUBindGroup;
  public lightPosBindGroup: GPUBindGroup;

  public readonly vertexCount;
  public readonly indexCount;

  // Assets
  object3D: Object3d;

  // t für die Rotation
  t: number = 0.0;
  public lightPos: vec3 = new Float32Array([0.0, 3.0, 0.0]);

  constructor(format: GPUTextureFormat, object: Object3d, private camera: mat4) {
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
    const lightUniform = this.object3D.material;

    this.transformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform);

    this.lightPosBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.lightPosBuffer, 0, <Float32Array>this.lightPos);

    this.pipeline = this.device.createRenderPipeline({
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
            format: this.format,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
      layout: "auto",
    });

    this.transformBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.transformBuffer } },
        { binding: 1, resource: { buffer: materialUniform.uniformBuffer } },
      ],
    });

    this.lightBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(1),
      entries: [{ binding: 0, resource: { buffer: lightUniform.lightBuffer } }],
    });

    this.lightPosBindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(2),
      entries: [{ binding: 0, resource: { buffer: this.lightPosBuffer } }],
    });
  }
}
