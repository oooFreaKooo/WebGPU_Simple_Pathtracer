import shader from './shader.wgsl';
import { RenderElement } from '../framework/render-element'

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


    public setColor(color: Float32Array) {

        // Lade Farbe in Buffer
        this.uniformBuffer = this.device.createBuffer({
            size: color.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.uniformBuffer, 0, color, 0, color.length);
    }

}