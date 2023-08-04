import { quat, vec3 } from "gl-matrix"
import { Camera } from "./camera"
import $ from "jquery"
import { deg2Rad } from "./math"

enum KeyCodes {
  W = "KeyW",
  S = "KeyS",
  A = "KeyA",
  D = "KeyD",
  SPACE = "Space",
  LEFT_CONTROL = "ControlLeft",
  LEFT_SHIFT = "ShiftLeft",
}
const SPEED = 0.05
export class Controls {
  canvas: HTMLCanvasElement
  private camera: Camera

  // Movement properties
  forwardsAmount: number = 0
  rightAmount: number = 0
  upAmount: number = 0
  shiftKeyHeld: boolean = false
  canJump: boolean = true

  // Mouse properties
  isMouseActive: boolean = false
  accumulatedDX: number = 0
  accumulatedDY: number = 0
  sensitivity: number = 0.1
  keysPressed: { [key: string]: boolean } = {}

  // Labels for displaying state
  private readonly keyLabel: HTMLElement
  private readonly mouseXLabel: HTMLElement
  private readonly mouseYLabel: HTMLElement

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas
    this.camera = camera
    this.keyLabel = document.getElementById("key-label") as HTMLElement
    this.mouseXLabel = document.getElementById("mouse-x-label") as HTMLElement
    this.mouseYLabel = document.getElementById("mouse-y-label") as HTMLElement

    this.initializeControls()
  }

  initializeControls() {
    // Lock the pointer to the canvas when the canvas is clicked
    this.canvas.onclick = () => {
      this.canvas.requestPointerLock()
    }

    // Update the isMouseActive flag when the pointer is locked or unlocked
    document.addEventListener(
      "pointerlockchange",
      () => {
        this.isMouseActive = document.pointerLockElement === this.canvas
      },
      false,
    )

    $(document).on("keydown", (event) => {
      this.keysPressed[event.code] = true
    })
    $(document).on("keyup", (event) => {
      this.keysPressed[event.code] = false
    })

    this.canvas.onpointerleave = () => {
      this.isMouseActive = false
    }
    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      if (this.isMouseActive) {
        this.handle_mouse_move(event)
      }
    })

    // Add a check for the pointer lock state when initializing
    this.isMouseActive = document.pointerLockElement === this.canvas
    setInterval(() => {
      this.updateMovement()
    }, 1000 / 60) // 60 times per second
  }

  updateMovement() {
    this.forwardsAmount = 0
    this.rightAmount = 0
    this.upAmount = 0

    if (this.keysPressed[KeyCodes.W]) {
      this.forwardsAmount = SPEED
    }
    if (this.keysPressed[KeyCodes.S]) {
      this.forwardsAmount = -SPEED
    }
    if (this.keysPressed[KeyCodes.A]) {
      this.rightAmount = SPEED
    }
    if (this.keysPressed[KeyCodes.D]) {
      this.rightAmount = -SPEED
    }
    if (this.keysPressed[KeyCodes.SPACE]) {
      this.upAmount = SPEED
    }
    if (this.keysPressed[KeyCodes.LEFT_CONTROL]) {
      this.upAmount = -SPEED
    }
    this.shiftKeyHeld = this.keysPressed[KeyCodes.LEFT_SHIFT]

    // Always update the player's position after changing any movement amounts
    this.movePlayer(this.forwardsAmount, this.rightAmount, this.upAmount, this.camera.forwards)
  }

  // Remove the movement updates from the handle_keypress and handle_keyrelease functions
  handle_keypress(event: JQuery.KeyDownEvent) {
    this.keyLabel.innerText = event.code
  }

  handle_keyrelease(event: JQuery.KeyUpEvent) {
    this.keyLabel.innerText = event.code
  }

  handle_mouse_move(event: MouseEvent) {
    if (this.isMouseActive) {
      this.rotate_camera(event.movementX * this.sensitivity, -event.movementY * this.sensitivity)
    }
  }
  rotate_camera(dX: number, dY: number) {
    this.camera.theta += dX
    this.camera.phi += dY

    // Restrict the vertical rotation to prevent flipping
    this.camera.phi = Math.max(-85, Math.min(85, this.camera.phi))

    this.camera.recalculate_vectors()
  }

  movePlayer(forwards_amount: number, right_amount: number, up_amount: number, forward: vec3) {
    // Moving in the forward direction using the passed 'forward' vector
    this.camera.position[0] += forward[0] * forwards_amount
    this.camera.position[1] += forward[1] * forwards_amount
    this.camera.position[2] += forward[2] * forwards_amount

    // Moving in the right direction
    this.camera.position[0] += this.camera.right[0] * right_amount
    this.camera.position[1] += this.camera.right[1] * right_amount
    this.camera.position[2] += this.camera.right[2] * right_amount

    // Moving in the up direction
    this.camera.position[0] += this.camera.up[0] * up_amount
    this.camera.position[1] += this.camera.up[1] * up_amount
    this.camera.position[2] += this.camera.up[2] * up_amount

    this.camera.recalculate_vectors()
  }
}
