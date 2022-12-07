import shader from './shader.wgsl';
 
 export class Material{

    public readonly vertexShader;
    public readonly fragmentShader;
    

    //TODO: uniform buffer mit farbe

    public _color: Float32Array;

     constructor(device: GPUDevice) {
        this.vertexShader = device.createShaderModule({                    
            code: shader.vertex
        })
        this.fragmentShader = device.createShaderModule({                    
            code: shader.vertex
        })
        
        // TODO: uniform buffer anlegen
        const uniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
      
     }
     
     public setColor(color: Float32Array ) {
        this._color = color;
    }

 }