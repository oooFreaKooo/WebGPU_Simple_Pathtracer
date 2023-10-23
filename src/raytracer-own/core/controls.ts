import { vec3 } from "gl-matrix"
import { Camera } from "./camera"
import $ from "jquery"

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
  private camera: Camera
  private canvas: HTMLCanvasElement
  // Movement properties
  private forwardsAmount: number = 0
  private rightAmount: number = 0
  private upAmount: number = 0
  private shiftKeyHeld: boolean = false
  // Mouse properties
  private isMouseActive: boolean = false
  private sensitivity: number = 0.1
  private keysPressed: { [key: string]: boolean } = {}

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

  private initializeControls() {
    this.canvas.onclick = () => {
      this.canvas.requestPointerLock()
    }

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

    this.isMouseActive = document.pointerLockElement === this.canvas
    setInterval(() => {
      this.updateMovement()
    }, 1000 / 60) // 60 times per second
  }

  private updateMovement() {
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

    this.movePlayer(this.forwardsAmount, this.rightAmount, this.upAmount, this.camera.forwards)
  }

  private handle_mouse_move(event: MouseEvent) {
    if (this.isMouseActive) {
      this.rotate_camera(event.movementX * this.sensitivity, -event.movementY * this.sensitivity)
    }
  }

  private rotate_camera(dX: number, dY: number) {
    const newTheta = this.camera.theta + dX
    const newPhi = Math.max(-85, Math.min(85, this.camera.phi + dY))

    if (this.camera.hasChanged(this.camera.position, newTheta, newPhi)) {
      this.camera.theta = newTheta
      this.camera.phi = newPhi
      this.camera.recalculate_vectors()
    }
  }

  private movePlayer(forwards_amount: number, right_amount: number, up_amount: number, forward: vec3) {
    const newPosition = new Float32Array(this.camera.position)

    newPosition[0] += forward[0] * forwards_amount
    newPosition[1] += forward[1] * forwards_amount
    newPosition[2] += forward[2] * forwards_amount

    newPosition[0] += this.camera.right[0] * right_amount
    newPosition[1] += this.camera.right[1] * right_amount
    newPosition[2] += this.camera.right[2] * right_amount

    newPosition[0] += this.camera.up[0] * up_amount
    newPosition[1] += this.camera.up[1] * up_amount
    newPosition[2] += this.camera.up[2] * up_amount

    if (this.camera.hasChanged(newPosition, this.camera.theta, this.camera.phi)) {
      this.camera.position = newPosition
      this.camera.recalculate_vectors()
    }
  }
}
