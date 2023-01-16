import { mat4 } from "gl-matrix";
import { Object3d } from "./object-3d";
import { Material } from "../examples/material";

export class RenderElement {
  //Device/Context objects
  //adapter: GPUAdapter;
  public device: GPUDevice;
  //context: GPUCanvasContext;
  public format: GPUTextureFormat;

  // Pipeline objects
  public transformBuffer: GPUBuffer;
  public bindGroup: GPUBindGroup;
  public pipeline: GPURenderPipeline;
  public bindGroupMaterial: GPUBindGroup;
  public readonly vertexCount;
  public readonly indexCount;

  // Assets
  object3D: Object3d;

  // t für die Rotation
  t: number = 0.0;

  constructor(
    format: GPUTextureFormat,
    object: Object3d,
    private camera: mat4
  ) {
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
    mat4.multiply(
      transformUniform,
      this.camera,
      this.object3D.calcWorldTransMatrix()
    );
    const materialUniform = this.object3D.material;
    this.transformBuffer = this.device.createBuffer({
      size: (<ArrayBuffer>transformUniform).byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(
      this.transformBuffer,
      0,
      <ArrayBuffer>transformUniform
    );

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
    this.bindGroup = this.device.createBindGroup({
      // Bind Group: specify the actual resources
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.transformBuffer, // bind uniform buffer to bind 0
          },
        },
      ],
    });

    this.bindGroupMaterial = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 1,
          resource: {
            buffer: this.transformBuffer,
          },
        },
      ],
    });
  }
}
