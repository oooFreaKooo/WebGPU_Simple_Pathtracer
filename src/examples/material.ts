import shader from "./shader.wgsl";
import {
  getModelViewMatrix,
  getLightProjectionMatrix,
  getLightViewMatrix,
  getShadowMatrix,
  CreateStorageBuffer,
  CreateUniformBuffer,
} from "./helper";

export class Material {
  public readonly vertexShader;
  public readonly fragmentShader;
  public device: GPUDevice;
  public colorBuffer: GPUBuffer;
  public modelViewBuffer: GPUBuffer;

  //Textures
  public samplerDescriptor: GPUSamplerDescriptor;
  public viewDescriptor: GPUTextureViewDescriptor;
  public texture: GPUTexture;
  public view: GPUTextureView;
  public sampler: GPUSampler;
  public hasTextureBuffer: GPUBuffer;

  // Light
  public ambientBuffer: GPUBuffer;
  public pointBuffer: GPUBuffer;
  public directionalBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    this.device = device;
    this.vertexShader = this.device.createShaderModule({
      code: shader,
    });
    this.fragmentShader = this.device.createShaderModule({
      code: shader,
    });
  }

  ///////////////////////////// OBJEKT -> Buffer ///////////////////////////////

  public setObject(NUM: number) {
    // NUM = Object number
    const modelViewMatrix = new Float32Array(NUM * 4 * 4);
    const color = new Float32Array(NUM * 4);
    // Loop for each object
    for (let i = 0; i < NUM; i++) {
      const position = { x: 1.0, y: 1.0, z: 1.0 };
      const rotation = { x: 1.0, y: 1.0, z: 1.0 };
      const scale = { x: 0.5, y: 0.5, z: 0.5 };
      const modelView = getModelViewMatrix(position, rotation, scale);
      modelViewMatrix.set(modelView, i * 4 * 4);
      color.set([0.1, 0.1, 0.1, 0.0], i * 4);
    }

    this.colorBuffer = CreateStorageBuffer(this.device, 4 * 4 * NUM);
    this.modelViewBuffer = CreateStorageBuffer(this.device, 4 * 4 * 4 * NUM);
    this.device.queue.writeBuffer(this.colorBuffer, 0, color);
    this.device.queue.writeBuffer(this.modelViewBuffer, 0, modelViewMatrix);

    //////////////////////////////// UI (Regler) /////////////////////////////////////
    document.querySelector("#object-brightness")!.addEventListener("input", (e: Event) => {
      const colorValue = +(e.target as HTMLInputElement).value;
      for (let i = 0; i < NUM; i++) {
        color[i * 4] = colorValue;
        color[i * 4 + 1] = colorValue;
        color[i * 4 + 2] = colorValue;
      }
      this.device.queue.writeBuffer(this.colorBuffer, 0, color);
    });
  }

  /////////////////////////////// TEXTUREN /////////////////////////////////

  async setTexture(device: GPUDevice, imageName: string, hasTexture: boolean) {
    hasTexture = true;
    this.hasTextureBuffer = CreateUniformBuffer(device, 4);
    this.device.queue.writeBuffer(this.hasTextureBuffer, 0, new Float32Array([hasTexture ? 1 : 0]));

    // get image file
    const img = document.createElement("img");
    img.src = "../src/examples/obj/" + imageName;
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    this.sampler = device.createSampler();
    // create texture
    this.texture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.view = this.texture.createView();
    device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: this.texture }, [
      imageBitmap.width,
      imageBitmap.height,
    ]);
  }

  //////////////////////////////// LIGHTING //////////////////////////////////

  public setLight() {
    var ambient = new Float32Array([0.05]);
    var directionalLight = new Float32Array(8);
    var pointLight = new Float32Array(8);

    // Point-Light Settings
    pointLight[2] = 10; // z
    pointLight[4] = 0.5; // intensitys
    pointLight[5] = 50; // radius

    // Directional Light Settings
    directionalLight[4] = 3; // intensity

    this.pointBuffer = CreateUniformBuffer(this.device, 8 * 4);
    this.ambientBuffer = CreateUniformBuffer(this.device, 1 * 4);
    this.directionalBuffer = CreateUniformBuffer(this.device, 8 * 4);

    this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight);
    this.device.queue.writeBuffer(this.directionalBuffer, 0, directionalLight);
    this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient);

    /*Shadows
     TODO:
      public shadowMatrixBuffer: GPUBuffer;
      const shadowMatrix = getShadowMatrix(device);
      this.shadowMatrixBuffer = this.device.createBuffer({
       size: 64,
       usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
      this.device.queue.writeBuffer(this.shadowMatrixBuffer, 0, shadowmatrix)
      lightProjectionMatrix.set(lightProjection, i * 4 * 4);
      lightViewMatrix.set(lightView, i * 4 * 4);
      shadowMatrix.set(shadow, i * 4 * 4);
      mat4.multiply(shadowMatrix, lightProjectionMatrix, lightViewMatrix); 
      const lightView = getLightViewMatrix(lightPosition);
      const lightProjection = getLightProjectionMatrix(1, 100);
      const shadow = getShadowMatrix(lightViewMatrix, lightProjectionMatrix, modelViewMatrix); 
      const shadowMatrix = new Float32Array(NUM * 4 * 4);
      const lightProjectionMatrix = new Float32Array(NUM * 4 * 4);
      const lightViewMatrix = new Float32Array(NUM * 4 * 4);
      const lightPosition = { x: 5, y: 5, z: 5 }; 
    */
    // usw.

    //////////////////////////////// UI (Regler)////////////////////////////////
    document.querySelector("#ambient")!.addEventListener("input", (e: Event) => {
      ambient[0] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.ambientBuffer, 0, ambient);
    });
    document.querySelector("#light-x")!.addEventListener("input", (e: Event) => {
      pointLight[0] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight);
    });
    document.querySelector("#light-y")!.addEventListener("input", (e: Event) => {
      pointLight[1] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight);
    });
    document.querySelector("#light-z")!.addEventListener("input", (e: Event) => {
      pointLight[2] = +(e.target as HTMLInputElement).value;
      this.device.queue.writeBuffer(this.pointBuffer, 0, pointLight);
    });
  }
}
