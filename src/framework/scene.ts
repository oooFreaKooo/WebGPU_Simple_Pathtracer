// Import necessary modules
import { Ground } from "./settings_ground"
import { Camera } from "../engine/camera"
import { vec3 } from "gl-matrix"
import { object_types, RenderData } from "../engine/helper"
import { ObjModel } from "./settings_obj"

// Define the Scene class
export class Scene {
  device: GPUDevice
  // Declare class variables
  ground: Ground
  object: ObjModel
  player: Camera
  object_data: Float32Array
  quad_count: number
  canJump: boolean = true
  objectBuffer: GPUBuffer

  // Constructor function to initialize class variables
  constructor(device: GPUDevice) {
    this.device = device
    this.ground = new Ground([0, 0, 0]) // Initialize ground position
    this.object_data = new Float32Array(32)
    this.object = new ObjModel([0, 0, 0], [0, 0, 0]) // Initialize object position and rotation
    this.player = new Camera([-3, 0, 1], 0, 0) // Initialize camera position and rotation
    this.quad_count = 1
  }

  // Update function to update the position and rotation of ground, object, and player
  async update(device: GPUDevice) {
    this.ground.update() // Update ground position and rotation
    var model = this.ground.get_model()
    for (var j: number = 0; j < 16; j++) {
      this.object_data[j] = <number>model.at(j) // Update object data array with ground model data
    }

    this.object.update() // Update object position and rotation
    model = this.object.get_model()
    for (j = 0; j < 16; j++) {
      this.object_data[16 + j] = <number>model.at(j) // Update object data array with object model data
    }

    this.player.update() // Update camera position and rotation
  }

  // Get function to return the camera object
  get_player(): Camera {
    return this.player
  }

  // Get function to return an object containing the camera view transform, object model transforms, and quad count
  get_renderables(): RenderData {
    return {
      view_transform: this.player.get_view(),
      model_transforms: this.object_data,
      object_counts: {
        [object_types.QUAD]: this.quad_count,
      },
    }
  }

  // Function to update camera rotation based on mouse movement
  spin_player(dX: number, dY: number) {
    this.player.eulers[2] -= dX // Update yaw
    this.player.eulers[2] %= 360 // Keep yaw in the range [0, 360)

    this.player.eulers[1] = Math.min(89, Math.max(-89, this.player.eulers[1] - dY)) // Update pitch and keep it in the range [-89, 89]
  }

  move_player(forwards_amount: number, right_amount: number, up_amount: number) {
    const GROUND_HEIGHT = 1.0 // The height of the ground
    const GRAVITY = -0.02 // The strength of the gravitational force
    const MAX_JUMP_HEIGHT = 10.0 // The maximum height of the jump
    const JUMP_SPEED = 0.5 // The speed of the jump

    // Apply gravity to the player's movement if they are in the air
    if (this.player.position[2] > GROUND_HEIGHT) {
      up_amount += GRAVITY
    }

    // Update the player's position based on their movement
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.forwards, forwards_amount)
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.right, right_amount)
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.up, up_amount)

    // Limit the player's jump height
    if (this.player.position[2] - GROUND_HEIGHT > MAX_JUMP_HEIGHT) {
      this.player.position[2] = GROUND_HEIGHT + MAX_JUMP_HEIGHT
    }

    // Set the y-coordinate to the ground height if the player is on the ground
    if (this.player.position[2] <= GROUND_HEIGHT) {
      this.player.position[2] = GROUND_HEIGHT
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
