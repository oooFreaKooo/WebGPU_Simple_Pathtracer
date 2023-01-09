import shader from './shader.wgsl';
import { makeCube } from "../examples/cube";
import { mat4, vec3, vec4 } from "gl-matrix"
import { IgnorePlugin } from "webpack";
import { Renderer } from "./renderer";
import { Object3d } from "./object-3d";
import { Material } from "../examples/material"

export class RenderElement {

    //Device/Context objects
    //adapter: GPUAdapter;
    public device: GPUDevice;
    //context: GPUCanvasContext;
    public format: GPUTextureFormat;

    // Pipeline objects 
    public transformBuffer: GPUBuffer
    public ambientBuffer: GPUBuffer
    public diffuseBuffer: GPUBuffer
    public specularBuffer : GPUBuffer
    public lightPosBuffer: GPUBuffer
    public lightColorBuffer: GPUBuffer
    public bindGroup: GPUBindGroup;
    public pipeline: GPURenderPipeline;
    public bindGroupMaterial: GPUBindGroup;
    public bindGroupPhong: GPUBindGroup;
    public readonly vertexCount;
    public readonly indexCount;



    // Assets
    object3D: Object3d;


    // t für die Rotation
    t: number = 0.0;



    constructor(format: GPUTextureFormat, object: Object3d, private camera: mat4) {
        this.device = object.device;
        this.format = format;
        this.object3D = object;
        this.makePipeline();
        this.vertexCount = object.vertexCount;
        this.indexCount = object.indexCount;

    }

    // create pipeline
    public makePipeline() {

        const material = new Material(this.device);
        const transformUniform: mat4 = mat4.create();
        mat4.multiply(transformUniform, this.camera, this.object3D.calcWorldTransMatrix());
        const materialUniform = this.object3D.material;
        this.transformBuffer = this.device.createBuffer({
            size: (<ArrayBuffer>transformUniform).byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform);
        
        // Uniforms für Phong Beleuchtung
        const ambient : vec3 = new Float32Array([0.2, 0.2, 0.2]);
        this.ambientBuffer = this.device.createBuffer({
            size: ambient.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.ambientBuffer, 0, <Float32Array>ambient);

        const diffuse : vec3 = new Float32Array([1.0, 0.8, 0.0]);
        this.diffuseBuffer = this.device.createBuffer({
            size: diffuse.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.diffuseBuffer, 0, <Float32Array>diffuse);

        const specular : vec3 = new Float32Array([1.0,1.0,1.0]);
        this.specularBuffer = this.device.createBuffer({
            size: specular.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.specularBuffer, 0, <Float32Array>specular);

        const lightPos : vec3 = new Float32Array([3, 3, 3]);
        this.lightPosBuffer = this.device.createBuffer({
            size: lightPos.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.lightPosBuffer, 0, <Float32Array>lightPos);

        const lightColor : vec3 = new Float32Array([1, 1, 1]);
        this.lightColorBuffer = this.device.createBuffer({
            size: lightColor.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.lightColorBuffer, 0, <Float32Array>lightColor);


        const bindGroupLayoutTransform = this.device.createBindGroupLayout({     // Declare what is being used
            entries: [
                {
                    binding: 0,                                             // bind group 0, includes binding 1 and 2
                    visibility: GPUShaderStage.VERTEX,                      // resource that will be visible in the vertex shader
                    buffer: {}                                              // specify that there will be a buffer
                },
            ]
        });

        this.bindGroup = this.device.createBindGroup({                  // Bind Group: specify the actual resources
            layout: bindGroupLayoutTransform,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.transformBuffer                       // bind uniform buffer to bind 0
                    }
                },
            ]
        });
        const bindGroupLayoutMaterial = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
            ]
        });

        this.bindGroupMaterial = this.device.createBindGroup({
            layout: bindGroupLayoutMaterial,
            entries: [
                {
                    binding: 1,
                    resource: {
                        buffer: this.transformBuffer
                    }
                },
            ]
        });

        const bindGroupLayoutPhong = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                
            ]
        });

        this.bindGroupPhong = this.device.createBindGroup({
            layout: bindGroupLayoutPhong,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.ambientBuffer
                    }                    
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.diffuseBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.lightColorBuffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.lightPosBuffer
                    }
                },
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayoutTransform, bindGroupLayoutMaterial, bindGroupLayoutPhong]
        });

        this.pipeline = this.device.createRenderPipeline({
            vertex: {
                //material.vertex
                module: material.vertexShader,

                entryPoint: "vs_main",
                buffers: [this.object3D.bufferLayout]
            },

            fragment: {
                //material.fragment
                module: material.fragmentShader,
                entryPoint: "fs_main",
                targets: [{
                    format: this.format
                }]
            },

            primitive: {
                topology: "triangle-list",
                cullMode: "none"
            },

            layout: pipelineLayout
        });
    }    
}