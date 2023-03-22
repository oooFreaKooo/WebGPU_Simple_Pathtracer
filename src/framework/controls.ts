import { Camera } from "../engine/camera"
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
  private camera: Camera

  //Labels for displaying state
  private readonly keyLabel: HTMLElement
  private readonly mouseXLabel: HTMLElement
  private readonly mouseYLabel: HTMLElement

  forwards_amount: number
  right_amount: number
  up_amount: number
  shiftKeyHeld: boolean
  canJump: boolean
  playerStoppedMoving: boolean
  isMouseActive = false

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas
    this.camera = camera
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
      this.canvas.requestFullscreen()
      this.isMouseActive = true
    }
    this.canvas.onpointerleave = () => {
      this.isMouseActive = false
    }
    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      if (this.isMouseActive) {
        this.handle_mouse_move(event)
      }
    })
  }

  handle_keypress(event: JQuery.KeyDownEvent) {
    this.keyLabel.innerText = event.code

    switch (event.code) {
      case KeyCodes.W:
        this.playerStoppedMoving = false
        const forwards = vec3.create()
        vec3.cross(forwards, this.camera.right, this.camera.up)
        vec3.normalize(forwards, forwards)
        this.forwards_amount = -0.05
        this.move_player(this.forwards_amount, 0, 0, forwards)
        break
      case KeyCodes.S:
        this.playerStoppedMoving = false
        this.forwards_amount = 0.05
        break
      case KeyCodes.A:
        this.playerStoppedMoving = false
        this.right_amount = -0.05
        break
      case KeyCodes.D:
        this.playerStoppedMoving = false
        this.right_amount = 0.05

        break
      case KeyCodes.SPACE:
        this.playerStoppedMoving = false
        this.up_amount = 0.04
        break
      case KeyCodes.LEFT_CONTROL:
        this.playerStoppedMoving = false
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
        this.playerStoppedMoving = true
        break
      case KeyCodes.S:
        this.playerStoppedMoving = true
        break
      case KeyCodes.A:
        this.playerStoppedMoving = true
        break
      case KeyCodes.D:
        this.playerStoppedMoving = true
        break
      case KeyCodes.SPACE:
        this.playerStoppedMoving = true
        break
      case KeyCodes.LEFT_CONTROL:
        this.playerStoppedMoving = true
        break
      case KeyCodes.LEFT_SHIFT:
        this.shiftKeyHeld = false
        break
    }
  }

  handle_mouse_move(event: MouseEvent) {
    if (this.isMouseActive) this.spin_player(event.movementX / 5, event.movementY / 5)
  }
  // Function to update camera rotation based on mouse movement
  spin_player(dX: number, dY: number) {
    const sensitivity = 0.05
    const orientation = this.camera.orientation

    orientation[0] -= dX * sensitivity
    orientation[1] -= dY * sensitivity

    // Limit the vertical orientation angle
    const maxAngle = Math.PI / 2.5
    const minAngle = -Math.PI / 2.5

    if (orientation[1] > maxAngle) {
      orientation[1] = maxAngle
    } else if (orientation[1] < minAngle) {
      orientation[1] = minAngle
    }

    this.camera.update()
  }

  move_player(forwards_amount: number, right_amount: number, up_amount: number, forward: vec3) {
    const speed = this.shiftKeyHeld ? 10 : 5
    const deceleration = 0.9
    const acceleration = 1.5

    const right = vec3.clone(this.camera.right)
    right[1] = 0
    vec3.normalize(right, right)

    const up = vec3.clone(this.camera.up)
    vec3.normalize(up, up)

    const movement = vec3.create()

    if (forwards_amount < 0.5) {
      forwards_amount *= acceleration
      if (forwards_amount > 0.5) {
        forwards_amount = 0.5
      }
    }

    vec3.scale(movement, forward, forwards_amount * speed)
    vec3.scaleAndAdd(movement, movement, right, right_amount * speed)
    vec3.scaleAndAdd(movement, movement, up, up_amount * speed)

    vec3.add(this.camera.position, this.camera.position, movement)
    this.camera.update()

    // Apply deceleration effect only when player has stopped moving
    if (this.playerStoppedMoving) {
      this.forwards_amount *= deceleration
      this.right_amount *= deceleration
      this.up_amount *= deceleration

      if (Math.abs(this.forwards_amount) < 0.01) {
        this.forwards_amount = 0
      }
      if (Math.abs(this.right_amount) < 0.01) {
        this.right_amount = 0
      }
      if (Math.abs(this.up_amount) < 0.01) {
        this.up_amount = 0
      }
    }
  }
}
