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
} from "../utils/helper"

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
    const shiny = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.0, specularChance: 0.02 })
    const mirror = new Material({ specularRoughness: 0.0, specularChance: 1.0 })
    const mirrorBlurry = new Material({ specularRoughness: 0.5, specularChance: 1.0 })
    const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
    const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
    const glass = new Material({
      specularChance: 0.02, // how reflective, 1.0 is 100%
      specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
      ior: 1.15, // index of refraction
      refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
      refractionColor: [0.0, 0.0, 0.0], // color absobtion of refractive objects
      refractionRoughness: 0.0, // self explanatory
    })

    // create an array of objects you want to use
    const objectsToLoad: ObjectProperties[] = [
      {
        modelPath: "./src/assets/models/plane.obj",
        material: grey,
        position: [0.0, 0.0, 0.0],
        scale: [0.5, 0.5, 0.5],
      },
      {
        modelPath: "./src/assets/models/plane.obj",
        material: lightSource,
        position: [0.0, 2.5, 2.5],
        scale: [0.15, 0.15, 0.15],
        rotation: [90.0, 180.0, 0.0],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: gold,
        position: [0.0, 2.0, 0.0],
        scale: [1.35, 1.35, 1.35],
      },
    ]

    // Preset scenes that I made for testing
    const cornelbox = createCornellBox()

    const scene1 = createScene1() // Refraction Roughness Test
    const scene2 = createScene2() // IOR Test
    const scene3 = createScene3() // Absorbsion Test
    const scene4 = createScene4() // Reflection Test
    const scene5 = createScene5() // Reflection roughtness Test
    const scene6 = createScene6() // Absorbsion Test
    const scene8 = createScene8()
    const scene9 = createScene9()

    // Create objects in the scene
    //await this.scene.createObjects(cornelbox)
    await this.scene.createObjects(scene9)

    // Build the BVH after creating all the objects
    await this.scene.prepareBVH()

    // Initialize the renderer
    await this.renderer.Initialize()
  }
}
