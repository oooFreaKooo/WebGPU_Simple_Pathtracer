import { vec3 } from "gl-matrix"
import { Camera } from "./core/camera"
import { Controls } from "./core/controls"
import { Renderer } from "./core/renderer"
import { Light } from "./objects/Light"
import { Node3d } from "./objects/Node3d"
import { ObjLoader } from "./utils/obj-loader"
import { setTexture } from "./utils/helper"
import { Material } from "./materials/material"
import { ObjMesh } from "./objects/ObjMesh"

const numLights = 14
let previousTime = 0
let frameTime = 0
let renderTime = 0
let fps = 0

export class Application1 {
  private canvas: HTMLCanvasElement
  private camera: Camera
  private cameraControls: Controls
  private renderer: Renderer = new Renderer()
  private root: Node3d = new Node3d()
  private lights: Light

  private animationFrameId?: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.cameraSetup()
  }

  private cameraSetup() {
    this.camera = new Camera([0, 3, 0], 0, 0)
    this.cameraControls = new Controls(this.canvas, this.camera)
  }

  private async loadAssets(): Promise<{ carData: Float32Array[]; texturesCar: any[] }> {
    const obj = new ObjLoader()

    const carData = await obj.initialize("./src/assets/models/car.obj")
    obj.clear()

    const texturesCarPromises = [
      "./src/assets/textures/car/paint.png",
      "./src/assets/textures/car/lens.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/textures_color.png",
      "./src/assets/textures/car/carbon.png",
      "./src/assets/textures/car/headlight.png",
      "./src/assets/textures/car/brake_lamp.png",
      "./src/assets/textures/car/reverse_lamp.png",
      "./src/assets/textures/car/turnsignal.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/ssr_color.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/ssr_color.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/ssr_color.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/brakes.png",
      "./src/assets/textures/car/ssr_color.png",
      "./src/assets/textures/car/tire.png",
      "./src/assets/textures/car/brakes.png",
    ].map((path) => setTexture(path))

    const texturesCar = await Promise.all(texturesCarPromises)

    return { carData, texturesCar }
  }

  private setupLights() {
    const maxnumlights = 100

    this.lights = new Light(numLights, [0.1, 0.1, 0.1])
    for (let i = 0; i < numLights - 6; i++) {
      this.lights.setDiffuseColor(i, [7, 7, 4])
    }

    this.lights.setDiffuseColor(8, [0, 0, 3])
    this.lights.setDiffuseColor(9, [3, 0, 0])
    this.lights.setDiffuseColor(10, [0, 3, 0])
    this.lights.setDiffuseColor(11, [0, 3, 3])
    this.lights.setDiffuseColor(12, [3, 0, 3])
    this.lights.setDiffuseColor(13, [3, 3, 0])
  }

  async start(): Promise<number> {
    const { carData, texturesCar } = await this.loadAssets()
    await this.initRenderer()
    this.createScene(carData, texturesCar)
    this.setupLights()
    this.animationFrameId = requestAnimationFrame(this.loop)
    return requestAnimationFrame(this.render)
  }

  stop() {
    // Call the cleanup method of the Application class
    this.cleanup()
  }

  cleanup() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = undefined
    }
  }

  private async initRenderer() {
    const maxnumlights = 100
    await this.renderer.init(this.canvas, maxnumlights)
  }

  private async createScene(carData: Float32Array[], texturesCar: any[]) {
    for (let i = 0; i < carData.length; i++) {
      const texture = texturesCar[i]
      const car = new ObjMesh(carData[i], new Material(texture), { x: -5, y: -1, z: -5, scaleX: 10.0, scaleY: 10.0, scaleZ: 10.0 })
      car.rotate(0, 45, 0)
      this.root.attach(car)
    }
  }

  private animate(now: number) {
    // All animation logic comes here
    const speed = this.cameraControls.shiftKeyHeld ? 2.0 : 1.0
    const forwards = vec3.create()
    vec3.cross(forwards, this.camera.right, this.camera.up)
    vec3.normalize(forwards, forwards)
    this.cameraControls.move_player(
      this.cameraControls.forwards_amount * speed,
      this.cameraControls.right_amount * speed,
      this.cameraControls.up_amount,
      forwards,
    )
    this.camera.update()
    const radius = 20
    const center = [-5, 0, -5]

    for (let i = 8; i < numLights - 3; i++) {
      const timeOffset = i * 2
      const angle = now + timeOffset

      const x = center[0] + radius * Math.cos(angle)
      const y = center[1]
      const z = center[2] + radius * Math.sin(angle)

      this.lights.setPointLightPosition(i, [x, y, z])
    }

    for (let i = 11; i < numLights; i++) {
      const timeOffset = i * 2
      const angle = now + timeOffset

      const x = center[0] + radius * Math.cos(angle)
      const y = center[1]
      const z = center[2] + radius * Math.sin(angle)

      this.lights.setPointLightPosition(i, [z, y, x])
    }
  }

  private render() {
    if (this.renderer) {
      this.renderer.frame(this.camera, this.lights, this.root)
    }
  }

  private loop = (now: number) => {
    if (this.animationFrameId !== undefined) {
      // Calculate frame time
      const currentTime = now / 1000
      frameTime = currentTime - previousTime
      previousTime = currentTime
      fps = 1 / frameTime

      this.animate(currentTime)

      // Calculate render time
      const renderStartTime = performance.now()
      this.render()
      renderTime = performance.now() - renderStartTime
      let frameTimeLabel: HTMLElement = <HTMLElement>document.getElementById("frame-time")
      let renderTimeLabel: HTMLElement = <HTMLElement>document.getElementById("render-time")
      // Update labels with frame time and render time
      if (frameTimeLabel) {
        frameTimeLabel.innerText = fps.toFixed(2).toString()
      }
      if (renderTimeLabel) {
        renderTimeLabel.innerText = renderTime.toFixed(2).toString()
      }

      this.animationFrameId = requestAnimationFrame(this.loop)
    }
  }
}
