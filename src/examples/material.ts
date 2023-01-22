import shader from "./shader.wgsl";
import { getModelViewMatrix, getProjectionMatrix } from "./helper";

export class Material {
  public readonly vertexShader;
  public readonly fragmentShader;
  public device: GPUDevice;
  public colorBuffer1: GPUBuffer;
  public modelViewBuffer: GPUBuffer;
  public projectionBuffer: GPUBuffer;
  public ambientBuffer: GPUBuffer;
  public pointBuffer: GPUBuffer;
  public directionalBuffer: GPUBuffer;
  public ambient = new Float32Array([0.1]);
  public directionalLight = new Float32Array(8);
  public pointLight = new Float32Array(8);
  public now = performance.now();

  constructor(device: GPUDevice) {
    this.device = device;
    this.vertexShader = this.device.createShaderModule({
      code: shader,
    });
    this.fragmentShader = this.device.createShaderModule({
      code: shader,
    });
    this.pointLight[2] = 10; // z
    this.pointLight[4] = 1; // intensitys
    this.pointLight[5] = 50; // radius
    this.directionalLight = new Float32Array(8);
    this.directionalLight[4] = 3; // intensity
    // UI
    document.querySelector("#ambient")?.addEventListener("input", (e: Event) => {
      this.ambient[0] = +(e.target as HTMLInputElement).value;
    });
  }

  public setObject(NUM: number) {
    this.colorBuffer1 = this.device.createBuffer({
      size: 4 * 4 * NUM,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.modelViewBuffer = this.device.createBuffer({
      size: 4 * 4 * 4 * NUM,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.projectionBuffer = this.device.createBuffer({
      size: 4 * 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const modelViewMatrix = new Float32Array(NUM * 4 * 4);
    const colorBuffer2 = new Float32Array(NUM * 4);
    for (let i = 0; i < NUM; i++) {
      const position = { x: 1.0, y: 1.0, z: 1.0 };
      const rotation = { x: 1.0, y: 1.0, z: 1.0 };
      const scale = { x: 0.5, y: 0.5, z: 0.5 };
      const modelView = getModelViewMatrix(position, rotation, scale);
      modelViewMatrix.set(modelView, i * 4 * 4);
      colorBuffer2.set([0.0, 1.0, 0.5, 0.5], i * 4);
    }
    this.device.queue.writeBuffer(this.colorBuffer1, 0, colorBuffer2);
    this.device.queue.writeBuffer(this.modelViewBuffer, 0, modelViewMatrix);
  }

  public setLight() {
    this.pointBuffer = this.device.createBuffer({
      size: 8 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.ambientBuffer = this.device.createBuffer({
      size: 1 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.directionalBuffer = this.device.createBuffer({
      size: 8 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.pointBuffer, 0, this.pointLight);
    this.device.queue.writeBuffer(this.directionalBuffer, 0, this.directionalLight);
    this.device.queue.writeBuffer(this.ambientBuffer, 0, this.ambient);
  }
}
