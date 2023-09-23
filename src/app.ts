import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"
import { ObjectProperties } from "./utils/helper"

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
    const mirrorMaterial = new Material({ albedo: [1.0, 0.0, 0.0], smoothness: 1.0, specularChance: 0.02 })
    const mirrorMaterial2 = new Material({ albedo: [1.0, 1.0, 1.0], smoothness: 1.0, specularChance: 1.0 })
    const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emission: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
    const objectsToLoad: ObjectProperties[] = [
      // Ground
      {
        modelPath: "./src/assets/models/ground.obj",
        material: whiteMaterial,
        position: [0.0, 0.0, 0.0],
        scale: [0.5, 0.5, 0.5],
      },
      // Ceiling
      {
        modelPath: "./src/assets/models/ground.obj",
        material: whiteMaterial,
        position: [0.0, 5.0, 0.0],
        scale: [0.5, 0.5, 0.5],
        rotation: [180.0, 0.0, 0.0],
      },
      // Left wall
      {
        modelPath: "./src/assets/models/ground.obj",
        material: redMaterial,
        position: [-2.5, 2.5, 0.0],
        scale: [0.5, 1.0, 0.5],
        rotation: [180.0, 0.0, 90.0],
      },
      // Right wall
      {
        modelPath: "./src/assets/models/ground.obj",
        material: greenMaterial,
        position: [2.5, 2.5, 0.0],
        scale: [0.5, 1.0, 0.5],
        rotation: [0.0, 180.0, 90.0],
      },
      // Back wall
      {
        modelPath: "./src/assets/models/ground.obj",
        material: whiteMaterial,
        position: [0.0, 2.5, 2.5],
        scale: [0.5, 1.0, 0.5],
        rotation: [90.0, 180.0, 0.0],
      },
      // Front wall
      {
        modelPath: "./src/assets/models/ground.obj",
        material: blueMaterial,
        position: [0.0, 2.5, -2.5],
        scale: [0.5, 1.0, 0.5],
        rotation: [90.0, 0.0, 0.0],
      },
      // Cube
      {
        modelPath: "./src/assets/models/cube.obj",
        material: mirrorMaterial,
        position: [-0.75, 1.5, 0.75],
        scale: [0.75, 1.5, 0.75],
        rotation: [0.0, -20.0, 0.0],
      },
      // Pyramid
      {
        modelPath: "./src/assets/models/pyramid.obj",
        material: glowMaterial,
        position: [1.0, 0.0, -1.0],
        scale: [1.0, 1.0, 1.0],
        rotation: [0.0, 28.0, 0.0],
      },
      // Monkey
      /*       {
        modelPath: "./src/assets/models/sphere.obj",
        material: mirrorMaterial,
        position: [1.0, 1.5, 0.0],
        scale: [0.75, 0.75, 0.75],
        rotation: [0.0, 180.0, 0.0],
      },
      {
        modelPath: "./src/assets/models/monkey.obj",
        material: whiteMaterial,
        position: [-1.0, 1.5, 0.0],
        scale: [0.75, 0.75, 0.75],
        rotation: [0.0, 180.0, 0.0],
      }, */
      // Lamp
      {
        modelPath: "./src/assets/models/cube.obj",
        material: whiteMaterial,
        position: [0.0, 4.99, 0.0],
        scale: [0.75, 0.01, 0.75],
      },
    ]

    await this.scene.createObjects(objectsToLoad)

    await this.renderer.Initialize()
  }
}
