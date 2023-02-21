import { Ground } from "./settings_ground"
import { Camera } from "../engine/camera"
import { vec3, mat4 } from "gl-matrix"
import { object_types, RenderData } from "../engine/helper"
import { ObjModel } from "./settings_obj"

export class Scene {
  ground: Ground
  object: ObjModel
  player: Camera
  object_data: Float32Array
  quad_count: number

  constructor() {
    this.ground = new Ground([0, 0, 0]) // Position Boden
    this.object_data = new Float32Array(32)
    this.object = new ObjModel([0, 0, 0], [0, 0, 0]) // Position Objekt
    this.player = new Camera([-3, 0, 1], 0, 0) // Position Kamera + winkel
    this.quad_count = 1
  }

  update() {
    this.ground.update()
    var model = this.ground.get_model()
    for (var j: number = 0; j < 16; j++) {
      this.object_data[j] = <number>model.at(j)
    }

    this.object.update()
    model = this.object.get_model()
    for (j = 0; j < 16; j++) {
      this.object_data[16 + j] = <number>model.at(j)
    }

    this.player.update()
  }

  get_player(): Camera {
    return this.player
  }

  get_renderables(): RenderData {
    return {
      view_transform: this.player.get_view(),
      model_transforms: this.object_data,
      object_counts: {
        [object_types.QUAD]: this.quad_count,
      },
    }
  }

  spin_player(dX: number, dY: number) {
    this.player.eulers[2] -= dX
    this.player.eulers[2] %= 360

    this.player.eulers[1] = Math.min(89, Math.max(-89, this.player.eulers[1] - dY))
  }

  move_player(forwards_amount: number, right_amount: number, up_amount: number) {
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.forwards, forwards_amount)
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.right, right_amount)
    vec3.scaleAndAdd(this.player.position, this.player.position, this.player.up, up_amount)
  }
}
