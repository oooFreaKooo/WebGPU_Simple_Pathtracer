import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"
import { ObjectProperties, createScene1, createCornellBox, createScene2, createScene3, createScene4, createScene5 } from "./utils/helper"

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
      refractionColor: [1.0, 0.0, 1.0],
      refractionRoughness: 0.0,
    })

    const objectsToLoad: ObjectProperties[] = [
      {
        modelPath: "./src/assets/models/diamond.obj",
        material: diamond,
        position: [0.0, 0.5, 0.0],
        scale: [1.0, 1.0, 1.0],
      },
    ]

    const cornelbox = createCornellBox()
    const scene1 = createScene1()
    const scene2 = createScene2()
    const scene3 = createScene3()
    const scene4 = createScene4()
    const scene5 = createScene5()
    await this.scene.createObjects(scene3)
    //await this.scene.createObjects(roughness_glass_test)

    await this.renderer.Initialize()
  }
}
