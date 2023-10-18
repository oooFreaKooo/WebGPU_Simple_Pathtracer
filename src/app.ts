import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"
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
} from "./utils/helper"

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
    const greyMaterial = new Material({ albedo: [0.64, 0.59, 0.62] })
    const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
    const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
    const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
    const specularMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 1.0, specularChance: 0.02 })
    const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.0, specularChance: 1.0 })
    const mirrorMaterial2 = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.95, specularChance: 1.0 })
    const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
    const glass = new Material({
      specularChance: 0.02,
      specularRoughness: 0.0,
      ior: 1.518,
      refractionChance: 1.0,
      refractionColor: [0.0, 0.0, 0.0],
      refractionRoughness: 0.0,
    })
    const glass2 = new Material({
      specularChance: 0.02,
      specularRoughness: 0.0,
      ior: 1.118,
      refractionChance: 1.0,
      refractionColor: [0.0, 0.1, 0.1],
      refractionRoughness: 0.0,
    })

    const objectsToLoad: ObjectProperties[] = [
      {
        modelPath: "./src/assets/models/plane.obj",
        material: greyMaterial,
        position: [0.0, 0.0, 0.0],
        scale: [0.5, 0.5, 0.5],
      },
      {
        modelPath: "./src/assets/models/teapot.obj",
        material: mirrorMaterial,
        position: [0.0, 0.0, 0.0],
        scale: [0.2, 0.2, 0.2],
      },
      {
        modelPath: "./src/assets/models/klein.obj",
        material: glass,
        position: [0.0, 0.0, 2.0],
        scale: [0.2, 0.2, 0.2],
      },
      {
        modelPath: "./src/assets/models/glass.obj",
        material: glass2,
        position: [2.0, 0.01, 2.0],
        scale: [0.2, 0.2, 0.2],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: glowMaterial,
        position: [-2.0, 0.25, 0.0],
        scale: [0.5, 0.5, 0.5],
      },
      {
        modelPath: "./src/assets/models/sphere.obj",
        material: glowMaterial,
        position: [0.0, 1.25, 2.0],
        scale: [0.5, 0.5, 0.5],
      },
    ]
    const cornelbox = createCornellBox()
    const scene1 = createScene1()
    const scene2 = createScene2()
    const scene3 = createScene3()
    const scene4 = createScene4()
    const scene5 = createScene5()
    const scene6 = createScene6()
    const scene8 = createScene8()
    await this.scene.createObjects(scene4)
    //await this.scene.pointCloudMesh(terrainPointCloud, glowMaterial)
    await this.scene.prepareBVH()
    await this.renderer.Initialize()
  }
}
