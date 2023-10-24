import { vec3 } from "gl-matrix"
import { Renderer } from "../core/renderer"
import { Material } from "../core/material"

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
    for (let mesh of instance.scene.objectMeshes) {
      mesh.material.emissionStrength = value
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

// Refraction Roughness Test
export function createScene1(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 0.02,
    specularColor: [0.8, 0.8, 0.8],
    specularRoughness: 0.0,
    refractionColor: [0.0, 0.0, 0.0],
    refractionChance: 1.0,
    refractionRoughness: 0.0,
    ior: 1.1,
  })

  const numSpheres = 9
  const roughness_glass_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const refractionRoughness = (i / (numSpheres - 1)) * 0.5

    roughness_glass_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        refractionRoughness: refractionRoughness,
      },
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of roughness_glass_test) {
    planes.push(ball)
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
    specularRoughness: 0.0,
    refractionChance: 1.0,
    refractionRoughness: 0.1,
    refractionColor: [1.5, 0.75, 0.25],
    ior: 1.1,
  })

  const numSpheres = 3
  const ior_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const ior = 1.2 + (0.05 * i) / (numSpheres - 1)

    ior_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        ior: ior,
      },
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of ior_test) {
    planes.push(ball)
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
    specularColor: [1.0, 1.0, 1.0],
    specularRoughness: 0.0,
    refractionChance: 1.0,
    refractionRoughness: 0.0,
    ior: 1.1,
  })

  const numSpheres = 9
  const test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const absorb = i / (numSpheres + 3)

    let refractionColor = vec3.fromValues(1.5, 1.0, 0.5)
    refractionColor[0] *= absorb
    refractionColor[1] *= absorb
    refractionColor[2] *= absorb
    test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        refractionColor: refractionColor,
      },
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of test) {
    planes.push(ball)
  }

  return planes
}

// Reflection Test
export function createScene4(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    albedo: [0.9, 0.1, 0.1],
    specularChance: 0.02,
    specularColor: [0.8, 0.8, 0.8],
    specularRoughness: 0.0,
  })

  const numSpheres = 9
  const refl_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const refl = (0.05 * i) / (numSpheres - 1)
    const roughness = 1.0 - i / (numSpheres - 1)
    refl_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        specularChance: refl,
        specularRoughness: roughness,
      },
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of refl_test) {
    planes.push(ball)
  }

  return planes
}
// Reflection roughtness Test
export function createScene5(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 1.0,
    albedo: [0.9, 0.1, 0.1],
    specularColor: [1.0, 1.0, 1.0],
    specularRoughness: 1.0,
  })

  const numSpheres = 9
  const refl_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const rough = 1.0 - i / (numSpheres - 3)
    const refl = (0.05 * i) / (numSpheres - 3)

    refl_test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        specularRoughness: refl,
        specularChance: rough,
      },
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of refl_test) {
    planes.push(ball)
  }

  return planes
}
// Absorbsion Test
export function createScene6(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material({
    specularChance: 0.02,
    specularColor: [1.0, 1.0, 1.0],
    specularRoughness: 0.0,
    refractionChance: 1.0,
    refractionRoughness: 0.0,
    ior: 1.1,
  })

  const numSpheres = 9
  const test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const absorb = i / (numSpheres + 3)

    let refractionColor = vec3.fromValues(1.5, 1.0, 0.5)
    refractionColor[0] *= absorb
    refractionColor[1] *= absorb
    refractionColor[2] *= absorb
    test.push({
      modelPath: "./src/assets/models/glass.obj",
      material: {
        ...glassBalls,
        refractionColor: refractionColor,
      },
      position: [positionX, 0.3, 0.0],
      scale: [0.3, 0.3, 0.3],
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
      position: [0.0, 2.01, 0.0],
      scale: [1.0, 1.0, 0.25],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
      position: [i, 1.0, 1.2],
      scale: [0.0125, 0.15, 0.15],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  }

  for (const ball of test) {
    planes.push(ball)
  }

  return planes
}

//
export function createScene8(): ObjectProperties[] {
  const sphereMaterial = new Material({ albedo: [1.0, 1.0, 1.0] }) // You can customize this material as needed

  const spheres: ObjectProperties[] = []

  const gridSize = 5
  const spacing = 3

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      for (let k = 0; k < gridSize; k++) {
        const positionX = i * spacing
        const positionY = j * spacing
        const positionZ = k * spacing

        spheres.push({
          modelPath: "./src/assets/models/monkey.obj",
          material: sphereMaterial,
          position: [positionX, positionY, positionZ],
          scale: [1.0, 1.0, 1.0],
        })
      }
    }
  }

  return spheres
}

const defaults: Material = {
  albedo: [0.8, 0.8, 0.8],
  specularColor: [1.0, 1.0, 1.0],
  emissionColor: [0.0, 0.0, 0.0],
  emissionStrength: 0.0,
  specularRoughness: 0.0,
  specularChance: 0.0,
  ior: 1.0,
  refractionChance: 0.0,
  refractionRoughness: 0.0,
  refractionColor: [0.0, 0.0, 0.0],
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomMaterial(): Material {
  return {
    ...defaults,
    albedo: [randomInRange(0.5, 1), randomInRange(0.5, 1), randomInRange(0.5, 1)],
    specularColor: [randomInRange(0, 1), randomInRange(0, 1), randomInRange(0, 1)],
    specularRoughness: randomInRange(0, 1),
    specularChance: randomInRange(0, 1),
    ior: randomInRange(1, 2),
    refractionChance: randomInRange(0.5, 1),
    refractionRoughness: randomInRange(0, 1),
  }
}

// Monkeys
export function createScene9(): ObjectProperties[] {
  const spheres: ObjectProperties[] = []
  const gridSize = 25

  let positionY = 0
  let positionZ = 0

  for (let i = 0; i < gridSize; i++) {
    positionZ = 0
    for (let k = 0; k < gridSize; k++) {
      spheres.push({
        modelPath: "./src/assets/models/dragon.obj",
        material: new Material(randomMaterial()),
        position: [1.0, positionY, positionZ],
        scale: [1.0, 1.0, 1.0],
      })
      positionZ += randomInRange(5, 5) // Random spacing in Z direction
    }
    positionY += randomInRange(5, 5) // Random spacing in X direction
  }
  return spheres
}
/* 
export function createScene9(): ObjectProperties[] {
  const spheres: ObjectProperties[] = []
  const gridSize = 15

  let positionX = 0
  let positionY = 0
  let positionZ = 0

  for (let i = 0; i < gridSize; i++) {
    positionY = 0
    for (let j = 0; j < gridSize; j++) {
      positionZ = 0
      for (let k = 0; k < gridSize; k++) {
        spheres.push({
          modelPath: "./src/assets/models/sphere.obj",
          material: new Material(randomMaterial()),
          position: [positionX, positionY, positionZ],
          scale: [2.0, 2.0, 2.0],
        })
        positionZ += randomInRange(5, 5) // Random spacing in Z direction
      }
      positionY += randomInRange(5, 5) // Random spacing in Y direction
    }
    positionX += randomInRange(5, 5) // Random spacing in X direction
  }

  return spheres
} */
