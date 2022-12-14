import { RenderElement } from "./render-element";
import { Node3d } from "./node-3d";
import { Object3d } from "./object-3d";
import { Camera } from "./camera";
import { CheckWebGPU } from "../examples/helper";
import shader from './shader.wgsl';
import $ from 'jquery';



export class Renderer {


    public adapter: GPUAdapter;
    public device: GPUDevice;
    public context: GPUCanvasContext;
    public format: 'bgra8unorm';
    public commandEncoder: GPUCommandEncoder;
    public textureView: any;
    public renderPass: any;


    // Initialisierung 
    public init = async (canvas: HTMLCanvasElement) => {
        console.log("Init Funktion");
        this.adapter = await navigator.gpu?.requestAdapter() as GPUAdapter;
        this.device = await this.adapter?.requestDevice() as GPUDevice;
        this.context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
        this.format = 'bgra8unorm';

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'opaque'
        });

        /*
        //####################################################################################
        // ToDo: In renderElementList Funktion auslagern
        const shader = Shaders('(1.0,1.0,0.0,1.0)');
        const pipeline = this.device.createRenderPipeline({
            layout:'auto',
            vertex: {
                module: this.device.createShaderModule({                    
                    code: shader.vertex
                }),
                entryPoint: "main"
            },
            fragment: {
                module: this.device.createShaderModule({                    
                    code: shader.fragment
                }),
                entryPoint: "main",
                targets: [{
                    format: this.format as GPUTextureFormat
                }]
            },
            primitive:{
            topology: "triangle-list",
            }
        });   
        */


        //###################################################################################

        this.commandEncoder = this.device.createCommandEncoder();
        this.textureView = this.context.getCurrentTexture().createView();
        this.renderPass = this.commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.textureView,
                clearValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 }, //background color
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        //#####################################################################################
        // ToDo: In renderElementList Funktion auslagern
        /*
        this.renderPass.setPipeline(pipeline);
        this.renderPass.draw(3, 1, 0, 0);
        this.renderPass.end();

        this.device.queue.submit([this.commandEncoder.finish()]);*/
    }
    //######################################################################################


    constructor(private canvas: HTMLCanvasElement) {

        const checkgpu = CheckWebGPU();
        if (checkgpu.includes('Your current browser does not support WebGPU!')) {
            console.log(checkgpu);
            throw ('Your current browser does not support WebGPU!');
        }
        this.init(canvas);

    }



    public render(node: Node3d, camera: Camera) {
        const renderElements: RenderElement[] = [];
        this.parseSceneGraphRepressively(node, renderElements);
        this.renderElementList(renderElements, camera);
    }

    public parseSceneGraphRepressively(node: Node3d, renderElements: RenderElement[]) {

        // TODO:
        // iterate over all node and children
        // update transform matrices and other props
        if (node.getUpdateFlag()) {
            node.calcTransformMat();
        }

        if (node instanceof Object3d) {
            const element = new RenderElement(node.device, this.format, node);
            renderElements.push(element);
        }

        for (const child of node.children) {
            this.parseSceneGraphRepressively(child, renderElements);
        }
    }

    /**
     * to be called every frame to draw the image
     */
    public renderElementList(elements: RenderElement[], camera: Camera): void {

        for (const element of elements) {
            // TODO: render element
        }
    }
}