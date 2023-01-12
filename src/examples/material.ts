import shader from './shader.wgsl';
import { RenderElement } from '../framework/render-element'
import { vec4 } from 'gl-matrix';

export class Material {

    public readonly vertexShader;
    public readonly fragmentShader;
    public device: GPUDevice;
    public uniformBuffer: GPUBuffer;

    constructor(device: GPUDevice) {
        this.device = device;
        this.vertexShader = this.device.createShaderModule({
            code: shader
        })
        this.fragmentShader = this.device.createShaderModule({
            code: shader
        })
    }


    public setColor(color: vec4) {

        // Lade Farbe in Buffer
        this.uniformBuffer = this.device.createBuffer({
            size: (<ArrayBuffer>color).byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>color, 0, color.length);
    }

}