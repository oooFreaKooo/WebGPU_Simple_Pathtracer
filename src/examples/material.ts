import { vec3, vec4 } from "gl-matrix";
import shader from "./shader.wgsl";

export class Material {
  public readonly vertexShader;
  public readonly fragmentShader;
  public device: GPUDevice;
  public uniformBuffer: GPUBuffer;
  public lightBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    this.device = device;
    this.vertexShader = this.device.createShaderModule({
      code: shader,
    });
    this.fragmentShader = this.device.createShaderModule({
      code: shader,
    });
  }

  public setColor(color: vec4) {
    // Lade Farbe in Buffer
    this.uniformBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>color, 0, color.length);
  }
  public setLight(ambient: vec3, diffuse: vec3, specular: vec3, lightColor: vec4) {
    this.lightBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(this.lightBuffer, 0, <ArrayBuffer>ambient, 0, ambient.length);
    this.device.queue.writeBuffer(this.lightBuffer, 0, <ArrayBuffer>diffuse, 0, diffuse.length);
    this.device.queue.writeBuffer(this.lightBuffer, 0, <ArrayBuffer>specular, 0, specular.length);
    this.device.queue.writeBuffer(this.lightBuffer, 0, <ArrayBuffer>lightColor, 0, lightColor.length);
  }
}
