import { mat4, vec3 } from "gl-matrix"

export const CheckWebGPU = () => {
  let result = "Great, your current browser supports WebGPU!"
  if (!navigator.gpu) {
    result = `Your current browser does not support WebGPU! Make sure you are on a system 
        with WebGPU enabled. Currently, WebGPU is supported in  
        <a href="https://www.google.com/chrome/canary/">Chrome canary</a>
        with the flag "enable-unsafe-webgpu" enabled. See the 
        <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"> 
        Implementation Status</a> page for more details.   
        You can also use your regular Chrome to try a pre-release version of WebGPU via
        <a href="https://developer.chrome.com/origintrials/#/view_trial/118219490218475521">Origin Trial</a>.                
        `
  }

  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement
  if (canvas) {
    const div = document.getElementsByClassName("item2")[0] as HTMLDivElement
    if (div) {
      canvas.width = div.offsetWidth
      canvas.height = div.offsetHeight

      function windowResize() {
        canvas.width = div.offsetWidth
        canvas.height = div.offsetHeight
      }
      window.addEventListener("resize", windowResize)
    }
  }

  return result
}

// return mvp matrix from given aspect, position, rotation, scale
function getMvpMatrix(
  aspect: number,
  position: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number },
  scale: { x: number; y: number; z: number },
) {
  // get modelView Matrix
  const modelViewMatrix = getModelViewMatrix(position, rotation, scale)
  // get projection Matrix
  const projectionMatrix = getProjectionMatrix(aspect)
  // get mvp matrix
  const mvpMatrix = mat4.create()
  mat4.multiply(mvpMatrix, projectionMatrix, modelViewMatrix)

  // return matrix as Float32Array
  return mvpMatrix as Float32Array
}

// return modelView matrix from given position, rotation, scale
function getModelViewMatrix(position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }) {
  // get modelView Matrix
  const modelViewMatrix = mat4.create()
  // translate position
  mat4.translate(modelViewMatrix, modelViewMatrix, vec3.fromValues(position.x, position.y, position.z))
  // rotate
  mat4.rotateX(modelViewMatrix, modelViewMatrix, rotation.x)
  mat4.rotateY(modelViewMatrix, modelViewMatrix, rotation.y)
  mat4.rotateZ(modelViewMatrix, modelViewMatrix, rotation.z)
  // scale
  mat4.scale(modelViewMatrix, modelViewMatrix, vec3.fromValues(scale.x, scale.y, scale.z))

  // return matrix as Float32Array
  return modelViewMatrix as Float32Array
}

function getLightViewMatrix(lightPosition: { x: number; y: number; z: number }) {
  const lightViewMatrix = mat4.create()
  mat4.lookAt(lightViewMatrix, [lightPosition.x, lightPosition.y, lightPosition.z], [0, 0, 0], [0, 1, 0])
  return lightViewMatrix
}

function getLightProjectionMatrix(near: number, far: number) {
  const lightProjectionMatrix = mat4.create()
  mat4.perspective(lightProjectionMatrix, (Math.PI / 180) * 90, 1, near, far)
  return lightProjectionMatrix
}

function getShadowMatrix(lightViewMatrix: mat4, lightProjectionMatrix: mat4, modelViewMatrix: mat4) {
  const shadowMatrix = mat4.create()
  mat4.multiply(shadowMatrix, lightProjectionMatrix, lightViewMatrix)
  mat4.multiply(shadowMatrix, shadowMatrix, modelViewMatrix)
  return shadowMatrix
}

const center = vec3.fromValues(0, 0, 0)
const up = vec3.fromValues(0, 1, 0)

function getProjectionMatrix(
  aspect: number,
  fov: number = (60 / 180) * Math.PI,
  near: number = 0.1,
  far: number = 100.0,
  position = { x: 0, y: 0, z: 0 },
) {
  // create cameraview
  const cameraView = mat4.create()
  const eye = vec3.fromValues(position.x, position.y, position.z)
  mat4.translate(cameraView, cameraView, eye)
  mat4.lookAt(cameraView, eye, center, up)
  // get a perspective Matrix
  const projectionMatrix = mat4.create()
  mat4.perspective(projectionMatrix, fov, aspect, near, far)
  mat4.multiply(projectionMatrix, projectionMatrix, cameraView)
  // return matrix as Float32Array
  return projectionMatrix as Float32Array
}

export const CreateGPUBuffer = (
  device: GPUDevice,
  data: Float32Array,
  usageFlag: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usageFlag,
    mappedAtCreation: true,
  })
  new Float32Array(buffer.getMappedRange()).set(data)
  buffer.unmap()
  return buffer
}

export const CreateGPUBufferUint = (
  device: GPUDevice,
  data: Uint32Array,
  usageFlag: GPUBufferUsageFlags = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usageFlag,
    mappedAtCreation: true,
  })
  new Uint32Array(buffer.getMappedRange()).set(data)
  buffer.unmap()
  return buffer
}

export const CreateUniformBuffer = (device: GPUDevice, size: number) => {
  const buffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  return buffer
}

export const CreateStorageBuffer = (device: GPUDevice, size: number) => {
  const buffer = device.createBuffer({
    size: size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  })
  return buffer
}

export const CreatePipeline = (device: GPUDevice, vertexShader: GPUShaderModule, fragmentShader: GPUShaderModule, format: GPUTextureFormat) => {
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: vertexShader,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 0,
              format: "float32x3",
              offset: 0,
            },
          ],
        },
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 1,
              format: "float32x2",
              offset: 0,
            },
          ],
        },
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 2,
              format: "float32x3",
              offset: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: fragmentShader,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back",
      frontFace: "ccw",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  })
  return pipeline
}

export { getMvpMatrix, getModelViewMatrix, getProjectionMatrix, getLightViewMatrix, getLightProjectionMatrix, getShadowMatrix }
