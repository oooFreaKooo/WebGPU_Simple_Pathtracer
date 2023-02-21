import { Renderer } from "../engine/renderer"
import { Scene } from "../framework/scene"
import $ from "jquery"

export class App {
  canvas: HTMLCanvasElement
  renderer: Renderer
  scene: Scene

  //Labels for displaying state
  keyLabel: HTMLElement
  mouseXLabel: HTMLElement
  mouseYLabel: HTMLElement

  forwards_amount: number
  right_amount: number
  up_amount: number
  shiftKeyHeld: boolean

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    this.renderer = new Renderer(canvas)

    this.scene = new Scene()

    this.keyLabel = <HTMLElement>document.getElementById("key-label")
    this.mouseXLabel = <HTMLElement>document.getElementById("mouse-x-label")
    this.mouseYLabel = <HTMLElement>document.getElementById("mouse-y-label")

    this.forwards_amount = 0
    this.right_amount = 0
    this.up_amount = 0
    this.shiftKeyHeld = false

    $(document).on("keydown", (event) => {
      this.handle_keypress(event)
    })
    $(document).on("keyup", (event) => {
      this.handle_keyrelease(event)
    })
    this.canvas.onclick = () => {
      this.canvas.requestPointerLock()
    }
    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      this.handle_mouse_move(event)
    })
  }

  async InitializeRenderer() {
    await this.renderer.Initialize()
  }

  run = () => {
    var running: boolean = true
    const speed = this.shiftKeyHeld ? 1.5 : 1.0 // Beim Shift gedrückt halten, bewegt man sich schneller

    this.scene.update()
    this.scene.move_player(this.forwards_amount * speed, this.right_amount * speed, this.up_amount)

    this.renderer.render(this.scene.get_renderables())

    if (running) {
      requestAnimationFrame(this.run)
    }
  }

  handle_keypress(event: JQuery.KeyDownEvent) {
    this.keyLabel.innerText = event.code

    if (event.code == "KeyW") {
      this.forwards_amount = 0.05
    }
    if (event.code == "KeyS") {
      this.forwards_amount = -0.05
    }
    if (event.code == "KeyA") {
      this.right_amount = -0.05
    }
    if (event.code == "KeyD") {
      this.right_amount = 0.05
    }
    if (event.code == "Space") {
      this.up_amount = 0.05
    }
    if (event.code == "ControlLeft") {
      this.up_amount = -0.05
    }
    if (event.code == "ShiftLeft") {
      this.shiftKeyHeld = true
    }
  }

  handle_keyrelease(event: JQuery.KeyUpEvent) {
    this.keyLabel.innerText = event.code

    if (event.code == "KeyW") {
      this.forwards_amount = 0
    }
    if (event.code == "KeyS") {
      this.forwards_amount = 0
    }
    if (event.code == "KeyA") {
      this.right_amount = 0
    }
    if (event.code == "KeyD") {
      this.right_amount = 0
    }
    if (event.code == "Space") {
      this.up_amount = 0
    }
    if (event.code == "ControlLeft") {
      this.up_amount = 0
    }
    if (event.code == "ShiftLeft") {
      this.shiftKeyHeld = false
    }
  }

  handle_mouse_move(event: MouseEvent) {
    this.scene.spin_player(event.movementX / 5, event.movementY / 5)
  }
}
