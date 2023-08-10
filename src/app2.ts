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
    await this.scene.createObject("./src/assets/models/cube.obj", [5.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    await this.scene.createObject("./src/assets/models/cube.obj", [10.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    await this.scene.createObject("./src/assets/models/cube.obj", [15.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    //await this.scene.createObject([1.0, 1.0, 0.0], "./src/assets/models/scene.obj", [20.0, 0.0, 0.0], [0.0, 0.0, 0.0])

    this.scene.buildBVH()
    this.scene.finalizeBVH()

    this.scene.blas_consumed = true

    await this.renderer.Initialize()
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.renderer && this.renderer.cleanup) {
      this.renderer.cleanup()
    }
  }
}
