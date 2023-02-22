import { Renderer } from "../engine/renderer"
import { Scene } from "../framework/scene"
import $ from "jquery"
import { Light } from "../engine/light"

export class App {
  canvas: HTMLCanvasElement
  spaceSource: HTMLAudioElement
  gainNode: GainNode
  audioContext: AudioContext
  renderer: Renderer
  scene: Scene
  lighting: Light

  //Labels for displaying state
  keyLabel: HTMLElement
  mouseXLabel: HTMLElement
  mouseYLabel: HTMLElement

  forwards_amount: number
  right_amount: number
  up_amount: number
  shiftKeyHeld: boolean
  canJump: boolean
  jetpackVolume = 0 // initialize the jetpack volume to zero

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    this.renderer = new Renderer(canvas)

    this.scene = new Scene()

    this.keyLabel = document.getElementById("key-label") as HTMLElement
    this.mouseXLabel = document.getElementById("mouse-x-label") as HTMLElement
    this.mouseYLabel = document.getElementById("mouse-y-label") as HTMLElement

    this.forwards_amount = 0
    this.right_amount = 0
    this.up_amount = 0
    this.shiftKeyHeld = false
    this.canJump = true

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

    // Wait for a click or touch event before creating and starting the AudioContext
    $(document).one("click touchstart", () => {
      this.audioContext = new AudioContext()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.spaceSource = new Audio("sounds/jetpack.mp3")
      const sourceNode = this.audioContext.createMediaElementSource(this.spaceSource)
      sourceNode.connect(this.gainNode)
    })
  }

  async InitializeRenderer() {
    await this.renderer.Initialize()
  }

  run = () => {
    const running = true
    const speed = this.shiftKeyHeld ? 2.0 : 1.0 // Beim Shift gedrückt halten, bewegt man sich schneller
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
    if (event.code == "Space" && this.scene.canJump) {
      this.up_amount = 0.04
      this.scene.canJump = false

      // Start playing the space sound and fade it in over 0.5 seconds
      this.spaceSource.currentTime = 0
      this.spaceSource.play()
      const fadeTime = 5.0 // seconds
      const fadeInInterval = setInterval(() => {
        this.jetpackVolume += 0.05 // increase the jetpack volume by 0.05 every interval
        this.gainNode.gain.setValueAtTime(this.jetpackVolume, this.audioContext.currentTime)
        if (this.jetpackVolume >= 0.5) {
          clearInterval(fadeInInterval) // stop the interval when the volume reaches 1
        }
      }, fadeTime)
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
    if (event.code == "Space" && !this.scene.canJump) {
      this.up_amount = 0
      this.scene.canJump = true

      // Stop playing the space sound and fade it out over 0.5 seconds
      const fadeTime = 5.0 // seconds
      const fadeOutInterval = setInterval(() => {
        this.jetpackVolume -= 0.05 // decrease the jetpack volume by 0.05 every interval
        this.gainNode.gain.setValueAtTime(this.jetpackVolume, this.audioContext.currentTime)
        if (this.jetpackVolume <= 0) {
          clearInterval(fadeOutInterval) // stop the interval when the volume reaches 0
          this.spaceSource.pause() // pause the sound when the volume reaches 0
        }
      }, fadeTime)
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
