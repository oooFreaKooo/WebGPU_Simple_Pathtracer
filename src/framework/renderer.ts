import { RenderElement } from "./render-element";
import { Node3d } from "./node-3d";
import { Object3d } from "./object-3d";
import { Camera } from "./camera";
import { CheckWebGPU } from "../examples/helper";

import $ from "jquery";
import { mat4 } from "gl-matrix";

export class Renderer {
  public adapter: GPUAdapter;
  public device: GPUDevice;
  public context: GPUCanvasContext;
  public format: GPUTextureFormat;
  public commandEncoder: GPUCommandEncoder;
  public textureView: any;
  public renderPass: any;

  // Initialisierung
  public init = async (canvas: HTMLCanvasElement) => {
    console.log("Init Funktion");
    this.adapter = (await navigator.gpu?.requestAdapter()) as GPUAdapter;
    this.device = (await this.adapter?.requestDevice()) as GPUDevice;
    this.context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;
    this.format = "bgra8unorm";

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque'
    });
    // this.commandEncoder = this.device.createCommandEncoder();
    this.textureView = this.context.getCurrentTexture().createView();
  }


  constructor(private canvas: HTMLCanvasElement) {

    const checkgpu = CheckWebGPU();
    if (checkgpu.includes('Your current browser does not support WebGPU!')) {
      console.log(checkgpu);
      throw ('Your current browser does not support WebGPU!');
    }
  }


  public render(node: Node3d, camera: Camera) {
    const renderElements: RenderElement[] = [];
    const cameraMat: mat4 = mat4.create();
    mat4.multiply(cameraMat, camera.getproj(), camera.getView());
    this.parseSceneGraphRecursive(node, renderElements, cameraMat);
    this.renderElementList(renderElements, camera);
    // console.log(camera.getView());
    // console.log(camera.getproj());
  }

  public parseSceneGraphRecursive(node: Node3d, renderElements: RenderElement[], camera: mat4) {

    if (node.getUpdateFlag()) {
      node.calcTransformMat();
    }
    if (node instanceof Object3d) {
      const element = new RenderElement(this.format, node, camera);
      renderElements.push(element);
    }

    for (const child of node.children) {
      this.parseSceneGraphRecursive(child, renderElements, camera);
    }
  }

  public renderElementList(elements: RenderElement[], camera: Camera): void {
    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }, //background color
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    for (const element of elements) {
      renderPass.setPipeline(element.pipeline);
      renderPass.setVertexBuffer(0, element.object3D.VertexBuffer);
      renderPass.setVertexBuffer(1, element.object3D.normalBuffer);
      renderPass.setIndexBuffer(element.object3D.indexBuffer, 'uint32');
      renderPass.setBindGroup(0, element.bindGroup);
      // renderPass.draw(3, 1, 0, 0);
      renderPass.drawIndexed(element.indexCount, 1, 0, 0);

    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
  }
}
