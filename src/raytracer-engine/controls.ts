import { quat, vec3 } from "gl-matrix"
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

export class Controls {
  canvas: HTMLCanvasElement
  private camera: Camera

  // Movement properties
  forwardsAmount: number = 0
  rightAmount: number = 0
  upAmount: number = 0
  shiftKeyHeld: boolean = false
  canJump: boolean = true
  playerStoppedMoving: boolean = true
  maxSpeed: number = 20
  minSpeed: number = 5

  // Mouse properties
  isMouseActive: boolean = false
  accumulatedDX: number = 0
  accumulatedDY: number = 0
  sensitivity: number = 0.01

  // Zoom properties
  zoomLevel: number = 1
  maxZoom: number = 2
  minZoom: number = 0.5

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
      this.handle_keypress(event)
    })
    $(document).on("keyup", (event) => {
      this.handle_keyrelease(event)
    })

    this.canvas.onpointerleave = () => {
      this.isMouseActive = false
    }
    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      if (this.isMouseActive) {
        this.handle_mouse_move(event)
      }
    })

    // Add mouse wheel event for zooming
    this.canvas.addEventListener("wheel", (event) => {
      this.handle_zoom(event)
    })

    // Add a check for the pointer lock state when initializing
    this.isMouseActive = document.pointerLockElement === this.canvas
  }

  handle_zoom(event: WheelEvent) {
    if (event.deltaY > 0) {
      this.zoomLevel = Math.max(this.zoomLevel - 0.1, this.minZoom)
    } else {
      this.zoomLevel = Math.min(this.zoomLevel + 0.1, this.maxZoom)
    }
    this.camera.position[2] *= this.zoomLevel // Assuming Z is the depth axis
  }

  handle_keypress(event: JQuery.KeyDownEvent) {
    this.keyLabel.innerText = event.code

    switch (event.code) {
      case KeyCodes.W:
        this.playerStoppedMoving = false
        this.forwardsAmount = -0.03
        this.movePlayer(this.forwardsAmount, 0, 0, this.camera.forwards)
        break
      case KeyCodes.S:
        this.playerStoppedMoving = false
        this.forwardsAmount = 0.03
        this.movePlayer(this.forwardsAmount, 0, 0, this.camera.forwards)
        break
      case KeyCodes.A:
        this.playerStoppedMoving = false
        this.rightAmount = -0.03
        break
      case KeyCodes.D:
        this.playerStoppedMoving = false
        this.rightAmount = 0.03
        break
      case KeyCodes.SPACE:
        this.playerStoppedMoving = false
        this.upAmount = -0.03
        break
      case KeyCodes.LEFT_CONTROL:
        this.playerStoppedMoving = false
        this.upAmount = 0.03
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
    if (this.isMouseActive) {
      this.rotate_camera(event.movementX / 10, -event.movementY / 10) // Reduced sensitivity and inverted Y
    }
  }

  rotate_camera(dX: number, dY: number) {
    const sensitivity = 0.5 // Adjust this value as needed

    // Calculate rotation around the world up axis (Y-axis)
    const horizontalRotation = quat.fromEuler(quat.create(), 0, -dX * sensitivity, 0) // Invert dX

    // Calculate rotation around the camera's right axis
    const verticalRotation = quat.fromEuler(quat.create(), -dY * sensitivity, 0, 0) // Invert dY

    // Combine the rotations
    const combinedRotation = quat.multiply(quat.create(), horizontalRotation, verticalRotation)

    // Apply the combined rotation to the camera's orientation
    quat.multiply(this.camera.orientation, this.camera.orientation, combinedRotation)

    // Update the camera's vectors based on the new orientation
    this.camera.recalculateVectors()
  }

  movePlayer(forwards_amount: number, right_amount: number, up_amount: number, forward: vec3) {
    // Dynamic speed calculation
    const speed = this.shiftKeyHeld ? this.maxSpeed : this.minSpeed + (Date.now() % 1000) / 100 // Increase speed based on key hold time
    const deceleration = 0.9

    // Scale the movement vector based on camera orientation
    const movement = new Float32Array(3)
    vec3.scale(movement, forward, forwards_amount * speed)
    vec3.scaleAndAdd(movement, movement, this.camera.right, right_amount * speed)
    vec3.scaleAndAdd(movement, movement, this.camera.up, up_amount * speed)

    // Update the camera position based on movement
    vec3.add(this.camera.position, this.camera.position, movement)

    // Recalculate the camera orientation vectors (if needed)
    this.camera.recalculateVectors()

    // Apply deceleration effect only when player has stopped moving
    if (this.playerStoppedMoving) {
      this.forwardsAmount *= deceleration
      this.rightAmount *= deceleration
      this.upAmount *= deceleration

      if (Math.abs(this.forwardsAmount) < 0.01) {
        this.forwardsAmount = 0
      }
      if (Math.abs(this.rightAmount) < 0.01) {
        this.rightAmount = 0
      }
      if (Math.abs(this.upAmount) < 0.01) {
        this.upAmount = 0
      }
    }
  }
}
