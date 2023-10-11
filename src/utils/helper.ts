import { vec3 } from "gl-matrix"
import { Renderer } from "../raytracer-engine/renderer"
import { Material } from "../raytracer-engine/material"

export interface ObjectProperties {
  modelPath: string
  material: Material
  position?: vec3
  scale?: vec3
  rotation?: vec3
  objectID?: number
}

export function Deg2Rad(theta: number): number {
  return (theta * Math.PI) / 180
}

export function addEventListeners(instance: Renderer) {
  document.querySelector<HTMLInputElement>("#emissionStrength")!.addEventListener("input", (event) => {
    const value = parseFloat((event.target as HTMLInputElement).value)
    for (let triangle of instance.scene.triangles) {
      triangle.material.emissionStrength = value
    }
    instance.updateTriangleData()
  })
}
export function linearToSRGB(x: number) {
  if (x <= 0.0031308) {
    return 12.92 * x
  }
  return 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055
}

export function createCornellBox(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
  const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
  const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
  const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.95, specularChance: 1.0 })
  return [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.0, 0.0],
      scale: [0.5, 0.5, 0.5],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 5.0, 0.0],
      scale: [0.5, 0.5, 0.5],
      rotation: [180.0, 0.0, 0.0],
    },
    // Left wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: redMaterial,
      position: [-2.5, 2.5, 0.0],
      scale: [0.5, 1.0, 0.5],
      rotation: [180.0, 0.0, 90.0],
    },
    // Right wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: greenMaterial,
      position: [2.5, 2.5, 0.0],
      scale: [0.5, 1.0, 0.5],
      rotation: [0.0, 180.0, 90.0],
    },
    // Back wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 2.5, 2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 180.0, 0.0],
    },
    // Front wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blueMaterial,
      position: [0.0, 2.5, -2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 0.0, 0.0],
    },
    // Lamp
    {
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [0.0, 4.99, 0.0],
      scale: [0.15, 1.0, 0.15],
    },
  ]
}

export function createBasic(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
  const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
  const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
  const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.95, specularChance: 1.0 })
  return [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: new Material(),
      position: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 0.25],
    },
    // Back wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 1.0, 1.2],
      scale: [1.0, 1.0, 0.15],
      rotation: [90.0, 180.0, 0.0],
    },
    // Lamp
    {
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [0.0, 4.99, 0.0],
      scale: [0.15, 1.0, 0.15],
      rotation: [0.0, 0.0, 180.0],
    },
  ]
}
