import { vec3 } from "gl-matrix";
import { Camera } from "./camera";

enum KeyCodes {
  W = "KeyW",
  S = "KeyS",
  A = "KeyA",
  D = "KeyD",
  SPACE = "Space",
  LEFT_CONTROL = "ControlLeft",
  LEFT_SHIFT = "ShiftLeft",
}

const SPEED = 5.0; // units per second for smoother movement
const SENSITIVITY = 0.1;

export class Controls {
  private forwards = 0;
  private right = 0;
  private up = 0;
  private keysPressed: Record<string, boolean> = {};
  private isMouseActive = false;
  private lastTimestamp = 0;

  constructor(private canvas: HTMLCanvasElement, private camera: Camera) {
    this.initControls();
  }

  private initControls() {
    this.canvas.onclick = () => this.canvas.requestPointerLock();

    document.addEventListener("pointerlockchange", () => {
      this.isMouseActive = document.pointerLockElement === this.canvas;
    });

    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.code] = false;
    });

    this.canvas.onpointerleave = () => {
      this.isMouseActive = false;
    };

    this.canvas.addEventListener("mousemove", (e: MouseEvent) => {
      if (this.isMouseActive) this.handleMouseMove(e);
    });

    requestAnimationFrame((timestamp) => this.update(timestamp));
  }

  private update(timestamp: number) {
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.updateMovement(deltaTime);
    requestAnimationFrame((ts) => this.update(ts));
  }

  private updateMovement(deltaTime: number) {
    this.forwards =
      (this.keysPressed[KeyCodes.W] ? 1 : 0) - (this.keysPressed[KeyCodes.S] ? 1 : 0);
    this.right =
      (this.keysPressed[KeyCodes.A] ? 1 : 0) - (this.keysPressed[KeyCodes.D] ? 1 : 0);
    this.up =
      (this.keysPressed[KeyCodes.SPACE] ? 1 : 0) - (this.keysPressed[KeyCodes.LEFT_CONTROL] ? 1 : 0);

    this.movePlayer(this.forwards, this.right, this.up, deltaTime);
  }

  private handleMouseMove(event: MouseEvent) {
    const dX = event.movementX * SENSITIVITY;
    const dY = -event.movementY * SENSITIVITY;
    this.rotateCamera(dX, dY);
  }

  private rotateCamera(dX: number, dY: number) {
    const newTheta = this.camera.theta + dX;
    const newPhi = Math.max(-85, Math.min(85, this.camera.phi + dY));

    if (this.camera.hasChanged(this.camera.position, newTheta, newPhi)) {
      this.camera.theta = newTheta;
      this.camera.phi = newPhi;
      this.camera.recalculate_vectors();
    }
  }

  private movePlayer(forwards: number, right: number, up: number, deltaTime: number) {
    const movement = vec3.create();
    vec3.scale(movement, this.camera.forwards, forwards * SPEED * deltaTime);
    vec3.scaleAndAdd(movement, movement, this.camera.right, right * SPEED * deltaTime);
    vec3.scaleAndAdd(movement, movement, this.camera.up, up * SPEED * deltaTime);

    const newPosition = vec3.create();
    vec3.add(newPosition, this.camera.position, movement);

    if (this.camera.hasChanged(newPosition as Float32Array, this.camera.theta, this.camera.phi)) {
      this.camera.position = newPosition as Float32Array;
      this.camera.recalculate_vectors();
    }
  }
}
