import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"
import { ObjectProperties, createBasic, createCornellBox } from "./utils/helper"

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
    const specularMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 1.0, specularChance: 0.02 })
    const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 1.0, specularChance: 1.0 })
    const mirrorMaterial2 = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.95, specularChance: 1.0 })
    const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
    const diamond = new Material({
      specularChance: 0.1,
      specularRoughness: 0.95,
      ior: 2.418,
      refractionChance: 1.0,
      refractionColor: [1.0, 1.0, 1.0],
      refractionRoughness: 0.0,
    })
    const glass = new Material({
      specularChance: 0.05,
      specularRoughness: 0.0,
      ior: 1.52,
      refractionChance: 1.0,
      refractionColor: [1.0, 0.0, 1.0],
    })
    const metal = new Material({
      specularRoughness: 0.0,
      specularChance: 1.0,
      ior: 1.0,
      refractionChance: 0.0,
      refractionColor: [0.0, 0.0, 0.0],
    })

    const objectsToLoad: ObjectProperties[] = [
      {
        modelPath: "./src/assets/models/diamond.obj",
        material: diamond,
        position: [0.0, 0.5, 0.0],
        scale: [1.0, 1.0, 1.0],
      },
    ]

    const glassBase: Material = new Material({
      specularChance: 0.1,
      specularRoughness: 0.9,
      ior: 1.42,
      refractionColor: [1.0, 1.0, 1.0],
      refractionChance: 1.0,
    })

    const objectsToLoad2: ObjectProperties[] = []

    for (let i = 0; i < 5; i++) {
      const positionX = -4.0 + i * 2.0 // This will give positions -4, -2, 0, 2, 4
      const refractionRoughness = 0.01 + i * 0.25 // This will give values 0, 0.25, 0.5, 0.75, 1.0

      objectsToLoad2.push({
        modelPath: "./src/assets/models/sphere.obj",
        material: {
          ...glassBase,
          refractionRoughness: refractionRoughness,
        },
        position: [positionX, 0.5, 0.0],
        scale: [1.0, 1.0, 1.0],
      })
    }

    const cornelbox = createCornellBox()
    const basic = createBasic()
    await this.scene.createObjects(cornelbox)

    await this.scene.createObjects(objectsToLoad)

    await this.renderer.Initialize()
  }
}
