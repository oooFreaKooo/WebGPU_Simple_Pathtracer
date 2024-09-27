import { Scene } from "./scene"
import { Material } from "./material"
import { Renderer } from "./renderer"
import {
  ObjectProperties,
  createScene1,
  createCornellBox,
  createScene2,
  createScene3,
  createScene4,
  createScene5,
  createScene6,
  createScene8,
  createScene9,
  createScene7,
  createCornellBox2,
  createCornellBox3,
  createScene10,
  createScene11,
  createScene12,
  createScene13,
  createCornellBox4,
  createScene14,
  createScene15,
} from "../utils/helper"
const { EventEmitter } = require("events")
const eventEmitter = new EventEmitter()

export class Application {
  private canvas: HTMLCanvasElement
  private renderer: Renderer
  private scene: Scene

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new Scene(canvas)
    this.renderer = new Renderer(this.canvas, this.scene)
  }

  async start() {

    // Preset scenes that I made for testing
    const cornelbox = createCornellBox() // with front wall
    const cornelbox2 = createCornellBox2() // without front wall
    const cornelbox3 = createCornellBox3() // mirrored walls
    const cornelbox4 = createCornellBox4() // empty

    const scene1 = createScene1() // Refraction Roughness Test
    const scene2 = createScene2() // IOR Test
    const scene3 = createScene3() // Refraction Color Test
    const scene4 = createScene4() // Reflection Test
    const scene5 = createScene5() // Reflection roughtness Test
    const scene6 = createScene6() // Emission Color Test
    const scene7 = createScene7() // Cornell Boxes Wall
    const scene8 = createScene8() // Dragon
    const scene9 = createScene9() // Monkeys with random materials
    const scene10 = createScene10() // Lamp with glass donut
    const scene11 = createScene11() // Lamp with glass of water
    const scene12 = createScene12() // All material types
    const scene13 = createScene13()
    const scene14 = createScene14()
    const scene15 = createScene15()
    // Create objects in the scene
    await this.scene.createObjects(cornelbox)

    // Build the BVH after creating all the objects
    await this.scene.prepareBVH()


    // Initialize the renderer
    await this.renderer.Initialize()
  }
}
