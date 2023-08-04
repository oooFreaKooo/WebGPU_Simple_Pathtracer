import { Scene } from "../src/raytracer-engine/scene"
import { Renderer } from "./raytracer-engine/renderer"

export class Application2 {
  private canvas: HTMLCanvasElement
  private scene: Scene
  private renderer: Renderer
  private animationFrameId?: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new Scene(canvas)
    this.renderer = new Renderer(this.canvas, this.scene)
  }

  async start() {
    await this.scene.loadObject([1.0, 1.0, 1.0], "./src/assets/models/scene.obj", [0.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    //await this.scene.loadObject([1.0, 1.0, 0.0], "./src/assets/models/cube.obj", [0.0, 0.0, 0.0])
    await this.scene.buildBVH()
    await this.scene.finalizeBVH()
    this.scene.blas_consumed = true
    await this.renderer.Initialize()
  }

  /*   private async loadAssets() {
    const objLoader = new ObjLoader()
    const cubeData = await objLoader.initialize([1, 1, 1], "./src/assets/models/statue.obj")
    const cube = new ObjMeshRT(cubeData, { x: 0, y: 0, z: 0, scaleX: 10.5, scaleY: 10.5, scaleZ: 10.5 })
    this.root.attach(cube)
  } */

  /*   private render() {
    const uploadStart = performance.now()

    if (this.renderer) {
      this.renderer.update()
      this.renderer.frame(this.canvas, this.root)
      const uploadEnd = performance.now()
      const uploadTimeLabel: HTMLElement = <HTMLElement>document.getElementById("upload-time")
      uploadTimeLabel.innerText = (uploadEnd - uploadStart).toFixed(2).toString()
    }
  }

  private loop = (now: number) => {
    // Calculate frame time
    const currentTime = now / 1000
    frameTime = currentTime - previousTime
    previousTime = currentTime
    fps = 1 / frameTime
    this.scene.update()
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
*/
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.renderer && this.renderer.cleanup) {
      this.renderer.cleanup()
    }
  }
}
