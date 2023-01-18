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
    public transformBuffer: GPUBuffer;
    public materialBuffer: GPUBuffer;
    public bindGroup: GPUBindGroup;
    public ambientBuffer: GPUBuffer
    public diffuseBuffer: GPUBuffer
    public specularBuffer : GPUBuffer
    public lightPosBuffer: GPUBuffer
    public lightColorBuffer: GPUBuffer
    public spotDirectionBuffer: GPUBuffer
    public spotExponentBuffer: GPUBuffer
    public spotCutoffBuffer: GPUBuffer
    public shininessBuffer: GPUBuffer
    public pipeline: GPURenderPipeline;
    public bindGroupMaterial: GPUBindGroup;
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

        this.pipeline = this.device.createRenderPipeline({
            layout: 'auto',
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
                cullMode: "back"
            },
        });

        const transformUniform: mat4 = mat4.create();
        mat4.multiply(transformUniform, this.camera, this.object3D.calcWorldTransMatrix());
        const materialUniform = this.object3D.material;

        // Uniform Buffer

        const ambient : vec3 = new Float32Array([0.2, 0.2, 0.2]);
        this.ambientBuffer = this.device.createBuffer({
            size: 3*4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.ambientBuffer, 0, <Float32Array>ambient);

        const diffuse : vec3 = new Float32Array([1.0, 1.0, 1.0]);
        this.diffuseBuffer = this.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.diffuseBuffer, 0, <Float32Array>diffuse);

        const specular : vec3 = new Float32Array([1.0,1.0,1.0]);
        this.specularBuffer = this.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.specularBuffer, 0, <Float32Array>specular);

        const lightPos : vec4 = new Float32Array([3, 3, 3, 0]);
        this.lightPosBuffer = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.lightPosBuffer, 0, <Float32Array>lightPos);

        const lightColor : vec3 = new Float32Array([1.0, 1.0, 1.0]);
        this.lightColorBuffer = this.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.lightColorBuffer, 0, <Float32Array>lightColor);
        
        const spot_direction : vec4 = new Float32Array([1.0, 1.0, 1.0,0.0]);
        this.spotDirectionBuffer = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.spotDirectionBuffer, 0, <Float32Array>spot_direction);

        const spot_exponent : Float32Array = new Float32Array([1.0]);
        this.spotExponentBuffer = this.device.createBuffer({
            size: 1 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.spotExponentBuffer, 0, <Float32Array>spot_exponent);

        const spot_cutoff : Float32Array = new Float32Array([1.0]);
        this.spotCutoffBuffer = this.device.createBuffer({
            size: 1 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.spotCutoffBuffer, 0, <Float32Array>spot_cutoff);

        const shininiess : Float32Array = new Float32Array([0.5]);
        this.shininessBuffer = this.device.createBuffer({
            size: 1 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.shininessBuffer, 0, <Float32Array>shininiess);
        

        this.transformBuffer = this.device.createBuffer({
            size: (<ArrayBuffer>transformUniform).byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform);
       
        this.bindGroup = this.device.createBindGroup({                  
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {binding: 0, resource: {buffer: this.transformBuffer}},
                {binding: 1, resource: {buffer: materialUniform.uniformBuffer}},
                {binding: 2, resource: {buffer: this.ambientBuffer}},
                {binding: 3, resource: {buffer: this.diffuseBuffer}},
                {binding: 4, resource: {buffer: this.specularBuffer}},
                {binding: 5, resource: {buffer: this.lightPosBuffer}},
                {binding: 6, resource: {buffer: this.lightColorBuffer}},                
                {binding: 7, resource: {buffer: this.spotDirectionBuffer}},
                {binding: 8, resource: {buffer: this.spotExponentBuffer}},
                {binding: 9, resource: {buffer: this.spotCutoffBuffer}},
                {binding: 10, resource: {buffer: this.shininessBuffer}},
                
            ]
        });        
    }
}