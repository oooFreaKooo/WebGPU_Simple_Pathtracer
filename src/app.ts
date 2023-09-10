import { Scene } from "./raytracer-engine/scene"
import { Material } from "./raytracer-engine/material"
import { Renderer } from "./raytracer-engine/renderer"

export class Application {
  private canvas: HTMLCanvasElement
  private scene: Scene
  private renderer: Renderer
  private animationFrameId?: number

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
    const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], roughness: 0.0 })
    const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emission: [1.0, 1.0, 0.8], emissionStrength: 1.0 })

    // Ground (no need for scaling since it's already 5x0x5)
    await this.scene.createObject("./src/assets/models/ground.obj", whiteMaterial, [0.0, 0.0, 0.0], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0])

    // Ceiling
    await this.scene.createObject("./src/assets/models/ground.obj", whiteMaterial, [0.0, 5.0, 0.0], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0])

    // Left wall
    await this.scene.createObject("./src/assets/models/ground.obj", redMaterial, [-5, 2.5, 0.0], [0.5, 1.0, 1.0], [0.0, 0.0, 90.0])

    // Right wall
    await this.scene.createObject("./src/assets/models/ground.obj", greenMaterial, [5, 2.5, 0.0], [0.5, 1.0, 1.0], [0.0, 0.0, 90.0])

    // Back wall
    await this.scene.createObject("./src/assets/models/ground.obj", whiteMaterial, [0.0, 2.5, 5], [1.0, 1.0, 0.5], [90.0, 0.0, 0.0])

    // Two cubes inside the Cornell Box
    // Since they're 1x1x1, they fit naturally in the room, but you can scale them if needed.
    //await this.scene.createObject("./src/assets/models/cube.obj", whiteMaterial, [-1.25, 1.5, 2.5], [0.75, 1.5, 0.75], [0.0, 0.0, -45.0])

    //await this.scene.createObject("./src/assets/models/cube.obj", whiteMaterial, [1.5, 1.0, 2.0], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0])
    await this.scene.createObject("./src/assets/models/cube.obj", mirrorMaterial, [1.5, 1.0, 2.0], [1.0, 1.0, 1.0], [0.0, 0.0, 0.0])
    // Lampe
    await this.scene.createObject("./src/assets/models/cube.obj", glowMaterial, [0.0, 4.85, 0.0], [1.75, 0.05, 1.75], [0.0, 0.0, 180.0])

    this.scene.buildBVH()

    await this.renderer.Initialize()
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.renderer && this.renderer.cleanup) {
      this.renderer.cleanup()
    }
  }
}
