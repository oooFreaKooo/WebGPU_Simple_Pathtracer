import { Renderer } from "../engine/renderer"
import { Scene } from "../framework/scene"
import { Controls } from "../engine/controls"

export class App {
  canvas: HTMLCanvasElement
  private renderer: Renderer
  private scene: Scene
  controls: Controls

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  async InitializeRenderer() {
    this.renderer = new Renderer(this.canvas)
    await this.renderer.Initialize()

    // Create the scene and pass the device to it
    this.scene = new Scene(this.renderer.device)
    this.controls = new Controls(this.canvas, this.scene)
  }

  run() {
    const speed = this.controls.shiftKeyHeld ? 2.0 : 1.0
    this.scene.update(this.renderer.device)
    this.controls.move_player(this.controls.forwards_amount * speed, this.controls.right_amount * speed, this.controls.up_amount)
    this.renderer.render(this.scene.get_renderables())
    requestAnimationFrame(() => this.run())
  }
}
