import { Scene } from "../src/raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
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
    const material1 = new Material(new Float32Array([1.0, 1.0, 1.0]))
    const material2 = new Material(new Float32Array([1.0, 1.0, 1.0]))
    await this.scene.createObject("./src/assets/models/scene.obj", material1, [0.0, 0.0, 0.0])
    //await this.scene.createObject("./src/assets/models/cube.obj", material1, [5.0, 0.0, 0.0])
    //await this.scene.createObject("./src/assets/models/cube.obj", material2, [-5.0, 0.0, 0.0])
    //await this.scene.createObject("./src/assets/models/cube.obj", material2, [0.0, -1.2, 0.0], [10.0, 0.2, 10.0], [0.0, 0.0, 0.0])

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
