import shader from './shader.wgsl';
import {RenderElement} from '../framework/render-element'

 export class Material{

    public readonly vertexShader;
    public readonly fragmentShader;
    public device: GPUDevice;
    public colorBuffer: GPUBuffer;

     constructor(device: GPUDevice) {
        this.device = device;
        this.vertexShader = this.device.createShaderModule({                    
            code: shader.vertex
        })
        this.fragmentShader = this.device.createShaderModule({                    
            code: shader.fragment
        })      
     }
     

    public setColor(color: Float32Array ) {

        // Lade Farbe in Buffer
        this.colorBuffer = this.device.createBuffer({
            size: color.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        
        this.device.queue.writeBuffer(this.colorBuffer, 0, color, 0, color.length);
    }

 }