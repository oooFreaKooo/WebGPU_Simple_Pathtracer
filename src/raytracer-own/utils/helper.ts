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
  const mirrorMaterial = new Material({ albedo: [1.0, 1.0, 1.0], specularRoughness: 0.05, specularChance: 1.0 })
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
    /*     {
      modelPath: "./src/assets/models/plane.obj",
      material: blueMaterial,
      position: [0.0, 2.5, -2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 0.0, 0.0],
    }, */
    // Lamp
    {
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [0.0, 4.9, 0.0],
      scale: [0.15, 1.0, 0.15],
    },
    // Sphere
    {
      modelPath: "./src/assets/models/cube.obj",
      material: mirrorMaterial,
      position: [-1.0, 1.65, 0.75],
      rotation: [0.0, -17.5, 0.0],
      scale: [0.75, 1.65, 0.75],
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: whiteMaterial,
      position: [1.0, 0.75, -0.5],
      rotation: [0.0, 17.5, 0.0],
      scale: [0.75, 0.75, 0.75],
    },
  ]
}

// Refraction Roughness Test
export function createScene1(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 7.5 })

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

// Refraction Color Test
export function createScene3(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 7.5 })

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
    const absorb = i / (numSpheres + i * 2)

    let refractionColor = vec3.fromValues(1.25, 1.0, 0.75)
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
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 7.5 })

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
      position: [0.0, 2.05, 0.0],
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
// Emission Color Test
export function createScene6(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const glassBalls: Material = new Material()

  const numSpheres = 9
  const test: ObjectProperties[] = []

  // Define rainbow colors
  const rainbowColors = [
    [1.0, 0.0, 0.0], // Red
    [1.0, 0.65, 0.0], // Orange
    [1.0, 1.0, 0.0], // Yellow
    [0.0, 1.0, 0.0], // Green
    [0.0, 0.0, 1.0], // Blue
    [0.75, 0.0, 1.0], // Indigo
    [0.58, 0.0, 0.83], // Violet
  ]

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const t = i / (numSpheres - 1)
    const colorIndex = t * (rainbowColors.length - 1)
    const lowerIndex = Math.floor(colorIndex)
    const upperIndex = Math.ceil(colorIndex)
    const exponent = 4 // Adjust this value for sharper or smoother transitions
    const mixFactor = Math.pow(colorIndex - lowerIndex, exponent)

    // Interpolate between two adjacent rainbow colors
    const emissionColorArray: [number, number, number] = [
      rainbowColors[lowerIndex][0] + mixFactor * (rainbowColors[upperIndex][0] - rainbowColors[lowerIndex][0]),
      rainbowColors[lowerIndex][1] + mixFactor * (rainbowColors[upperIndex][1] - rainbowColors[lowerIndex][1]),
      rainbowColors[lowerIndex][2] + mixFactor * (rainbowColors[upperIndex][2] - rainbowColors[lowerIndex][2]),
    ] as [number, number, number]

    const emissionVec3 = vec3.fromValues(...emissionColorArray)

    test.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: {
        ...glassBalls,
        emissionColor: emissionVec3,
        emissionStrength: 1.0,
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

// Cornell Box wall Test
export function createScene7(): ObjectProperties[] {
  const gridSize = 25
  const spacing = 7.5

  const objects: ObjectProperties[] = []

  // Calculate the total width and height of the entire grid
  const totalWidth = (gridSize - 1) * spacing
  const totalHeight = (gridSize - 1) * spacing

  // Adjust the starting position of the grid
  const startX = -totalWidth / 2
  const startY = -totalHeight / 2

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const offsetX = startX + i * spacing
      const offsetY = startY + j * spacing

      // Get the objects for a single Cornell box
      const cornellBox = createCornellBox()

      // Adjust the positions of all objects in the Cornell box
      for (const obj of cornellBox) {
        if (obj.position) {
          obj.position[0] += offsetX
          obj.position[1] += offsetY
          objects.push(obj)
        }
      }
    }
  }

  return objects
}

// Dragons
export function createScene8(): ObjectProperties[] {
  // create the Materials you want to use
  const grey = new Material({ albedo: [0.64, 0.59, 0.62] })
  const shiny = new Material({ albedo: [1.0, 0.5, 0.5], specularRoughness: 0.1, specularChance: 0.52 })
  const mirror = new Material({ specularRoughness: 0.1, specularChance: 1.0 })
  const mirrorBlurry = new Material({ specularRoughness: 0.25, specularChance: 1.0 })
  const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 10.0 })
  const lightSourceStrong = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 50.0 })
  const lightWeak = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 0.85], emissionStrength: 2.5 })
  const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
  const glass = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.15, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionColor: [0.0, 0.0, 0.0], // color absobtion of refractive objects
    refractionRoughness: 0.0, // self explanatory
  })
  const glassLamp = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.0, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionColor: [0.0, 0.1, 0.1], // color absobtion of refractive objects
    refractionRoughness: 0.0, // self explanatory
  })

  // create an array of objects you want to use
  const objectsToLoad: ObjectProperties[] = [
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorBlurry,
      position: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 1.0],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: shiny,
      rotation: [90.0, 0.0, 90.0],
      position: [0.0, 0.0, 5],
      scale: [1.0, 1.0, 1.0],
    },
    {
      modelPath: "./src/assets/models/lamp_piece1.obj",
      material: gold,
      position: [0.0, 0.0, -3],
      scale: [3.0, 3.0, 3.0],
      rotation: [0, 0.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/lamp_piece2.obj",
      material: grey,
      position: [0.0, 0.0, -3],
      scale: [3.0, 3.0, 3.0],
      rotation: [0, 0.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/lamp_piece3.obj",
      material: lightSourceStrong,
      position: [0.0, 0.0, -3],
      scale: [3.0, 3.0, 3.0],
      rotation: [0, 0.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/dragon.obj",
      material: gold,
      position: [0.0, 0.0, 1.5],
      scale: [0.64, 0.64, 0.64],
    },
    /*     {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [-8.0, 6.0, 0.0],
      scale: [0.25, 0.25, 0.25],
      rotation: [125.0, 90.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: grey,
      position: [8.0, 6.0, 0.0],
      scale: [0.25, 0.25, 0.25],
      rotation: [65.0, 90.0, 0.0],
    }, */
    {
      modelPath: "./src/assets/models/cube.obj",
      material: lightSource,
      position: [0.0, 5.0, 5.0],
      scale: [5.0, 0.25, 0.25],
    },
  ]

  return objectsToLoad
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

// Random Material Monkeys
export function createScene9(): ObjectProperties[] {
  const spheres: ObjectProperties[] = []
  const gridSize = 15

  let positionY = 0
  let positionZ = 0

  for (let i = 0; i < gridSize; i++) {
    positionZ = 0
    for (let k = 0; k < gridSize; k++) {
      spheres.push({
        modelPath: "./src/assets/models/monkey.obj",
        material: new Material(randomMaterial()),
        position: [1.0, positionY, positionZ],
        scale: [1.0, 1.0, 1.0],
      })
      positionZ += randomInRange(5, 5) // Random spacing if needed
    }
    positionY += randomInRange(5, 5)
  }
  return spheres
}
