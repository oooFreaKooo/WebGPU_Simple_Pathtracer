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
    // create the Materials you want to use
    const grey = new Material({ albedo: [0.64, 0.59, 0.62] })
    const mirror = new Material({ specularRoughness: 0.0, specularChance: 1.0 })
    const mirrorBlurry = new Material({ specularRoughness: 0.41, specularChance: 0.62, albedo: [0.8, 0.5, 0.0] })
    const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
    const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
    const glass = new Material({
      specularChance: 0.05, // how reflective, 1.0 is 100%
      specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
      ior: 1.6, // index of refraction
      refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
      refractionColor: [0.0, 0.0, 0.0], // color absobtion of refractive objects
      refractionRoughness: 0.0, // self explanatory
    })
    const glassTinted = new Material({
      specularChance: 0.05, // how reflective, 1.0 is 100%
      specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
      ior: 1.6, // index of refraction
      refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
      refractionColor: [0.0, 0.0, 0.2], // color absobtion of refractive objects
      refractionRoughness: 0.0, // self explanatory
    })
    const shiny: Material = new Material({
      albedo: [0.6, 0.2, 0.2],
      specularChance: 0.2,
      specularColor: [0.8, 0.8, 0.8],
      specularRoughness: 0.0,
    })

    // create an array of objects you want to use
    const objectsToLoad: ObjectProperties[] = [
      /*       {
        modelPath: "./src/assets/models/sphere.obj",
        material: mirror,
        position: [-1.25, 0.76, 0.64],
        rotation: [0.0, 0.0, 0.0],
        scale: [1.5, 1.5, 1.5],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: glassTinted,
        position: [-1.45, 0.5, 0.0],
        rotation: [0.0, 0.0, 0.0],
        scale: [1.0, 1.0, 1.0],
      },*/

      {
        modelPath: "./src/assets/models/teapot.obj",
        material: mirrorBlurry,
        position: [0.9, 1.52, -0.75],
        rotation: [0.0, -35.0, 0.0],
        scale: [0.15, 0.15, 0.15],
      },
      /*       {
        modelPath: "./src/assets/models/horse.obj",
        material: glassTinted,
        position: [1.0, 1.5, -1.0],
        rotation: [0.0, -78.0, 0.0],
        scale: [1.0, 1.0, 1.0],
      }, */

      /*       {
        modelPath: "./src/assets/models/plane.obj",
        material: lightSource,
        position: [0.0, 6.5, 6.5],
        scale: [0.55, 0.55, 0.55],
        rotation: [125.0, 180.0, 0.0],
      },
      {
        modelPath: "./src/assets/models/dragon.obj",
        material: gold,
        position: [0.0, 0.0, 0.0],
        scale: [0.55, 0.55, 0.55],
      },
      {
        modelPath: "./src/assets/models/cube.obj",
        material: glass,
        position: [0.0, 1.0, 0.0],
        scale: [2.0, 2.0, 2.0],
      }, */
    ]

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
    await this.scene.createObjects(scene12)

    // Build the BVH after creating all the objects
    eventEmitter.on("BVH", async () => await this.scene.prepareBVH())
    eventEmitter.emit("BVH")

    // Initialize the renderer
    await this.renderer.Initialize()
  }
}
