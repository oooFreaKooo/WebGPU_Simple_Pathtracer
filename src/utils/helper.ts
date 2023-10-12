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

export async function setTexture(textureUrl: string) {
  const res = await fetch(textureUrl)
  const img = await res.blob()
  const options: ImageBitmapOptions = { imageOrientation: "flipY" }
  const imageBitmap = await createImageBitmap(img, options)
  return imageBitmap
}

export function createCornellBox(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
  const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
  const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
  const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularSmoothness: 0.95, specularChance: 1.0 })
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

// Refraction Roughness Test
export function createScene1(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 0.02,
    specularColor: [0.8, 0.8, 0.8],
    specularSmoothness: 1.0,
    refractionColor: [1.0, 1.0, 1.0],
    refractionChance: 1.0,
    refractionRoughness: 0.0,
    ior: 1.1,
  })

  const numSpheres = 5
  const roughness_glass_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i * 2.0
    const refractionRoughness = (i / (numSpheres - 1)) * 0.5

    roughness_glass_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        refractionRoughness: refractionRoughness,
      },
      position: [positionX, 0.75, 0.0],
      scale: [1.0, 1.0, 1.0],
    })
  }

  const planes: ObjectProperties[] = [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 0.25],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blackMaterial,
      position: [0.0, 3.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.25) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.5 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.025, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  for (const ball of roughness_glass_test) {
    planes.push(ball)

    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [ball.position![0], 3.0, ball.position![2]],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  return planes
}

// IOR Test
export function createScene2(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 0.02,
    specularColor: [0.8, 0.8, 0.8],
    specularSmoothness: 1.0,
    refractionChance: 1.0,
    refractionRoughness: 0.1,
    ior: 1.1,
  })

  const numSpheres = 5
  const ior_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i * 2.0
    const ior = 1.0 + (0.5 * i) / (numSpheres - 1)

    ior_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        ior: ior,
      },
      position: [positionX, 0.75, 0.0],
      scale: [1.0, 1.0, 1.0],
    })
  }

  const planes: ObjectProperties[] = [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 0.25],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blackMaterial,
      position: [0.0, 3.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.25) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.5 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.025, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  // Add glass balls and lamps
  for (const ball of ior_test) {
    planes.push(ball)

    // Add a lamp above each ball
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [ball.position![0], 3.0, ball.position![2]],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  return planes
}

// Absorbsion Test
export function createScene3(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 0.02,
    specularColor: [0.8, 0.8, 0.8],
    specularSmoothness: 1.0,
    refractionChance: 1.0,
    refractionRoughness: 0.0,
    ior: 1.1,
  })

  const numSpheres = 5
  const test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i * 2.0
    const absorb = i / (numSpheres - 1.75)

    const refractionColor = vec3.fromValues(1.0 - absorb, 1.0 - absorb * absorb, 1.0 - absorb * absorb * absorb)

    test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        refractionColor: refractionColor,
      },
      position: [positionX, 0.75, 0.0],
      scale: [1.0, 1.0, 1.0],
    })
  }

  const planes: ObjectProperties[] = [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 0.25],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blackMaterial,
      position: [0.0, 3.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.25) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.5 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.025, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  // Add glass balls and lamps
  for (const ball of test) {
    planes.push(ball)

    // Add a lamp above each ball
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [ball.position![0], 3.0, ball.position![2]],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  return planes
}
