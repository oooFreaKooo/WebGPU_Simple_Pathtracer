import shader from './shader.wgsl';
import { makeCube } from "../examples/cube";
import { mat4 } from "gl-matrix"
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
    public bindGroup: GPUBindGroup;
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
        const transformUniform: mat4 = mat4.create();
        mat4.multiply(transformUniform, this.camera, this.object3D.getWorldTransform());
        const materialUniform = this.object3D.material;
        this.transformBuffer = this.device.createBuffer({
            size: (<ArrayBuffer>transformUniform).byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.transformBuffer, 0, <ArrayBuffer>transformUniform);
        // this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>model);    // (what we are writing to, offset bytes each matrix 64 starting at 0, select matrix)
        //  this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>view);
        //  this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>projection);
        //TODO
        //Binding/Gruppe für Material --> ist in Material Klasse 
        //Indices einbauen (wenn in Object3D)

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

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayoutTransform, bindGroupLayoutMaterial]
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
    public getObject() {
        return this.object3D;
    }
    // create assets (load in Cube Mesh)
    //async createAssets() {
    //    this.cube = makeCube(this.device);     
    //}


    /* // render: setup render encoder etc.
     render = () => {
 
         this.t += 0.05;
         if (this.t > 2.0 * Math.PI) {
             this.t -= 2.0 * Math.PI;
         }
 
         //make transforms
         const projection = mat4.create();
         // load perspective projection into the projection matrix,
         // Field of view = 45 degrees (pi/4)
         // Aspect ratio = 800/600
         // near = 0.1, far = 10 
         mat4.perspective(projection, Math.PI/4, 800/600, 0.1, 10);
 
         const view = mat4.create();
         //load lookat matrix into the view matrix,
         //looking from [-2, 0, 2]
         //looking at [0, 0, 0]
         //up vector is [0, 0, 1]
         mat4.lookAt(view, [-2, 0, 2], [0, 0, 0], [0, 0, 1]);
 
 
         const model = mat4.create();
         //Store, in the model matrix, the model matrix after rotating it by t radians around the z axis.
         mat4.rotate(model, model, this.t, [0,0,1]);
         
 
         this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>model);    // (what we are writing to, offset bytes each matrix 64 starting at 0, select matrix)
         this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>view);
         this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>projection);
 
         //command encoder: records draw commands for submission
         const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
         //texture view: image view to the color buffer in this case
         const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
         //renderpass: holds draw commands, allocated from command encoder
         const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
             colorAttachments: [{
                 view: textureView,
                 clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                 loadOp: "clear",
                 storeOp: "store"
             }]
         });
         renderpass.setPipeline(this.pipeline);
         renderpass.setVertexBuffer(0, this.cube.buffer);  
         renderpass.setBindGroup(0, this.bindGroup);
         renderpass.draw(3, 1, 0, 0);
         renderpass.end();
     
         this.device.queue.submit([commandEncoder.finish()]);
 
         requestAnimationFrame(this.render);

         // tick function that updates CameraPosition after requestAnimationFrame(this.render);
         const myCamera = new Camera( ... );
         render() {
             requestAnimationframe(render);
             if (myCamera.tick()){
                 myCamera.computeProjection();
             }
         }
     }
 
 */
}