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
}
