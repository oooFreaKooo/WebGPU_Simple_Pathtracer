import { Scene } from "../framework/scene"
import $ from "jquery"
import { vec3 } from "gl-matrix"

enum KeyCodes {
  W = "KeyW",
  S = "KeyS",
  A = "KeyA",
  D = "KeyD",
  SPACE = "Space",
  LEFT_CONTROL = "ControlLeft",
  LEFT_SHIFT = "ShiftLeft",
}

export class Controls {
  canvas: HTMLCanvasElement
  spaceSource: HTMLAudioElement
  gainNode: GainNode
  audioContext: AudioContext
  private scene: Scene

  //Labels for displaying state
  private readonly keyLabel: HTMLElement
  private readonly mouseXLabel: HTMLElement
  private readonly mouseYLabel: HTMLElement

  forwards_amount: number
  right_amount: number
  up_amount: number
  shiftKeyHeld: boolean
  canJump: boolean
  jetpackVolume = 0
  private readonly step = 0.05

  constructor(canvas: HTMLCanvasElement, scene: Scene) {
    this.canvas = canvas
    this.scene = scene
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

  handleSpaceKeyPress() {
    // Start playing the space sound and fade it in over 0.5 seconds
    this.spaceSource.currentTime = 0
    this.spaceSource.play()
    const fadeTime = 500 // milliseconds
    this.fadeInJetpackSound(0, fadeTime)
  }

  handleSpaceKeyRelease() {
    // Stop playing the space sound and fade it out over 0.5 seconds
    const fadeTime = 500 // milliseconds
    this.fadeOutJetpackSound(this.jetpackVolume, fadeTime)
  }

  handle_keypress(event: JQuery.KeyDownEvent) {
    this.keyLabel.innerText = event.code

    switch (event.code) {
      case KeyCodes.W:
        this.forwards_amount = 0.05
        break
      case KeyCodes.S:
        this.forwards_amount = -0.05
        break
      case KeyCodes.A:
        this.right_amount = -0.05
        break
      case KeyCodes.D:
        this.right_amount = 0.05
        break
      case KeyCodes.SPACE:
        if (this.canJump) {
          this.up_amount = 0.04
          this.canJump = false

          // Start playing the space sound and fade it in over 0.5 seconds
          this.handleSpaceKeyPress()
        }
        break
      case KeyCodes.LEFT_CONTROL:
        this.up_amount = -0.05
        break
      case KeyCodes.LEFT_SHIFT:
        this.shiftKeyHeld = true
        break
    }
  }

  handle_keyrelease(event: JQuery.KeyUpEvent) {
    this.keyLabel.innerText = event.code

    switch (event.code) {
      case KeyCodes.W:
      case KeyCodes.S:
        this.forwards_amount = 0
        break
      case KeyCodes.A:
      case KeyCodes.D:
        this.right_amount = 0
        break
      case KeyCodes.SPACE:
        if (!this.canJump) {
          this.up_amount = 0
          this.canJump = true

          // Stop playing the space sound and fade it out over 0.5 seconds
          this.handleSpaceKeyRelease()
        }
        break
      case KeyCodes.LEFT_CONTROL:
        this.up_amount = 0
        break
      case KeyCodes.LEFT_SHIFT:
        this.shiftKeyHeld = false
        break
    }
  }

  fadeInJetpackSound(currentVolume: number, fadeTime: number) {
    const newVolume = Math.min(currentVolume + this.step, 0.5)
    this.jetpackVolume = newVolume
    this.gainNode.gain.setValueAtTime(this.jetpackVolume, this.audioContext.currentTime)

    if (newVolume < 0.5) {
      setTimeout(() => this.fadeInJetpackSound(newVolume, fadeTime), fadeTime / 10)
    }
  }

  fadeOutJetpackSound(currentVolume: number, fadeTime: number) {
    const newVolume = Math.max(currentVolume - this.step, 0)
    this.jetpackVolume = newVolume
    this.gainNode.gain.setValueAtTime(this.jetpackVolume, this.audioContext.currentTime)

    if (newVolume > 0) {
      setTimeout(() => this.fadeOutJetpackSound(newVolume, fadeTime), fadeTime / 10)
    }
  }

  handle_mouse_move(event: MouseEvent) {
    this.spin_player(event.movementX / 5, event.movementY / 5)
  }
  // Function to update camera rotation based on mouse movement
  spin_player(dX: number, dY: number) {
    this.scene.player.eulers[2] -= dX // Update yaw
    this.scene.player.eulers[2] %= 360 // Keep yaw in the range [0, 360)

    this.scene.player.eulers[1] = Math.min(89, Math.max(-89, this.scene.player.eulers[1] - dY)) // Update pitch and keep it in the range [-89, 89]
  }

  move_player(forwards_amount: number, right_amount: number, up_amount: number) {
    const GROUND_HEIGHT = 1.0 // The height of the ground
    const GRAVITY = -0.02 // The strength of the gravitational force
    const MAX_JUMP_HEIGHT = 10.0 // The maximum height of the jump
    const JUMP_SPEED = 0.5 // The speed of the jump

    // Apply gravity to the player's movement if they are in the air
    if (this.scene.player.position[2] > GROUND_HEIGHT) {
      up_amount += GRAVITY
    }

    // Update the player's position based on their movement
    vec3.scaleAndAdd(this.scene.player.position, this.scene.player.position, this.scene.player.forwards, forwards_amount)
    vec3.scaleAndAdd(this.scene.player.position, this.scene.player.position, this.scene.player.right, right_amount)
    vec3.scaleAndAdd(this.scene.player.position, this.scene.player.position, this.scene.player.up, up_amount)

    // Limit the player's jump height
    if (this.scene.player.position[2] - GROUND_HEIGHT > MAX_JUMP_HEIGHT) {
      this.scene.player.position[2] = GROUND_HEIGHT + MAX_JUMP_HEIGHT
    }

    // Set the y-coordinate to the ground height if the player is on the ground
    if (this.scene.player.position[2] <= GROUND_HEIGHT) {
      this.scene.player.position[2] = GROUND_HEIGHT
      this.canJump = true // Reset the ability to jump if the player is on the ground
    }

    // Check if the player can jump
    if (up_amount > 0 && this.canJump) {
      // Apply the jump speed to the player's upward movement
      up_amount = JUMP_SPEED
      this.canJump = false // Set the ability to jump to false
    } else if (up_amount < 0 && !this.canJump) {
      // Apply gravity to the player's downward movement when they're falling
      up_amount += GRAVITY
    }
  }
}
