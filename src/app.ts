import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"
import { ObjectProperties, createCornellBox } from "./utils/helper"

export class Application {
  private canvas: HTMLCanvasElement
  private scene: Scene
  private renderer: Renderer

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene = new Scene(canvas)
    this.renderer = new Renderer(this.canvas, this.scene)
  }

  async start() {
    // Materials for the Cornell Box
    const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
    const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
    const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
    const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
    const specularMaterial = new Material({ albedo: [1.0, 1.0, 1.0], smoothness: 1.0, specularChance: 0.02 })
    const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], smoothness: 1.0, specularChance: 1.0 })
    const mirrorMaterial2 = new Material({ albedo: [1.0, 1.0, 1.0], smoothness: 0.95, specularChance: 1.0 })
    const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emission: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
    const objectsToLoad: ObjectProperties[] = [
      // Spheres
      {
        modelPath: "./src/assets/models/horse.obj",
        material: whiteMaterial,
        position: [1.5, 0.0, -1.5],
        scale: [1.0, 1.0, 1.0],
        rotation: [0.0, -65.0, 0.0],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: mirrorMaterial,
        position: [-1.5, 0.5, -1.5],
        scale: [1.0, 1.0, 1.0],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: glowMaterial,
        position: [0.25, 0.25, -1.75],
        scale: [0.5, 0.5, 0.5],
      },
      {
        modelPath: "./src/assets/models/cube.obj",
        material: mirrorMaterial2,
        position: [-0.75, 1.5, 0.75],
        scale: [0.75, 1.5, 0.75],
        rotation: [0.0, -20.0, 0.0],
      },
      // Pyramid
      /*       {
        modelPath: "./src/assets/models/monkey.obj",
        material: specularMaterial,
        position: [1.0, 0.0, 1.0],
        scale: [1.0, 1.0, 1.0],
        rotation: [0.0, 28.0, 0.0],
      }, */
      // Monkey
      /*       {
        modelPath: "./src/assets/models/sphere.obj",
        material: mirrorMaterial,
        position: [1.0, 1.5, 0.0],
        scale: [0.75, 0.75, 0.75],
        rotation: [0.0, 180.0, 0.0],
      },*/
    ]

    const cornelbox = createCornellBox()
    await this.scene.createObjects(cornelbox)

    await this.scene.createObjects(objectsToLoad)

    await this.renderer.Initialize()
  }
}
