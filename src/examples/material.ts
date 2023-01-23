import shader from "./shader.wgsl";
import { getModelViewMatrix, getLightProjectionMatrix, getLightViewMatrix, getShadowMatrix } from "./helper";
import { mat4 } from "gl-matrix";

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
  /*   public shadowMatrixBuffer: GPUBuffer; */
  public ambient = new Float32Array([0.05]);
  public directionalLight = new Float32Array(8);
  public pointLight = new Float32Array(8);

  constructor(device: GPUDevice) {
    this.device = device;
    this.vertexShader = this.device.createShaderModule({
      code: shader,
    });
    this.fragmentShader = this.device.createShaderModule({
      code: shader,
    });
    this.pointLight[2] = 10; // z
    this.pointLight[4] = 0.5; // intensitys
    this.pointLight[5] = 50; // radius
    this.directionalLight[4] = 3; // intensity
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
    /*     const shadowMatrix = new Float32Array(NUM * 4 * 4);
    const lightProjectionMatrix = new Float32Array(NUM * 4 * 4);
    const lightViewMatrix = new Float32Array(NUM * 4 * 4);
    const lightPosition = { x: 5, y: 5, z: 5 }; */

    // set the values of the lightViewMatrix and lightProjectionMatrix here

    const colorBuffer2 = new Float32Array(NUM * 4);
    for (let i = 0; i < NUM; i++) {
      const position = { x: 1.0, y: 1.0, z: 1.0 };
      const rotation = { x: 1.0, y: 1.0, z: 1.0 };
      const scale = { x: 0.5, y: 0.5, z: 0.5 };
      const modelView = getModelViewMatrix(position, rotation, scale);
      /*       const lightView = getLightViewMatrix(lightPosition);
      const lightProjection = getLightProjectionMatrix(1, 100);
      const shadow = getShadowMatrix(lightViewMatrix, lightProjectionMatrix, modelViewMatrix); */
      modelViewMatrix.set(modelView, i * 4 * 4);
      /*       lightProjectionMatrix.set(lightProjection, i * 4 * 4);
      lightViewMatrix.set(lightView, i * 4 * 4);
      shadowMatrix.set(shadow, i * 4 * 4);
      mat4.multiply(shadowMatrix, lightProjectionMatrix, lightViewMatrix); */
      colorBuffer2.set([0.1, 0.1, 0.1, 0.0], i * 4);
    }
    /*     this.shadowMatrixBuffer = this.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.shadowMatrixBuffer, 0, shadowMatrix); */
    this.device.queue.writeBuffer(this.colorBuffer1, 0, colorBuffer2);
    this.device.queue.writeBuffer(this.modelViewBuffer, 0, modelViewMatrix);

    document.querySelector("#object-brightness")!.addEventListener("input", (e: Event) => {
      const colorValue = +(e.target as HTMLInputElement).value;
      for (let i = 0; i < NUM; i++) {
        colorBuffer2[i * 4] = colorValue;
        colorBuffer2[i * 4 + 1] = colorValue;
        colorBuffer2[i * 4 + 2] = colorValue;
      }
      this.device.queue.writeBuffer(this.colorBuffer1, 0, colorBuffer2);
    });
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
    // UI
    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      this.ambient[0] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.ambientBuffer, 0, this.ambient);
    });
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      this.pointLight[0] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, this.pointLight);
    });
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      this.pointLight[1] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, this.pointLight);
    });
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      this.pointLight[2] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, this.pointLight);
    });
  }
}
