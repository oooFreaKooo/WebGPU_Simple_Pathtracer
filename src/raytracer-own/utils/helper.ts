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

export async function setTexture(textureUrl: string) {
  const res = await fetch(textureUrl)
  const img = await res.blob()
  const options: ImageBitmapOptions = { imageOrientation: "flipY" }
  const imageBitmap = await createImageBitmap(img, options)
  return imageBitmap
}

// Img Output Settings
const vignetteStrengthElement = document.getElementById("vignetteStrength")
const vignetteStrengthValueElement = document.getElementById("vignetteStrengthValue")
const vignetteRadiusElement = document.getElementById("vignetteRadius")
const vignetteRadiusValueElement = document.getElementById("vignetteRadiusValue")

// Camera Settings
const fovElement = document.getElementById("fov")
const fovValueElement = document.getElementById("fovValue")
const focusDistElement = document.getElementById("focusDist")
const focusDistValueElement = document.getElementById("focusDistValue")
const apertureSizeElement = document.getElementById("apertureSize")
const apertureSizeValueElement = document.getElementById("apertureSizeValue")

// Settings
const bouncesElement = document.getElementById("bounces")
const bouncesValueElement = document.getElementById("bouncesValue")
const samplesElement = document.getElementById("samples")
const samplesValueElement = document.getElementById("samplesValue")
const skyTextureCheckbox = document.getElementById("skyTexture") as HTMLInputElement
const backfaceCullingCheckbox = document.getElementById("backfaceCulling") as HTMLInputElement
const jitterElement = document.getElementById("jitter")
const jitterValueElement = document.getElementById("jitterValue")

export function addEventListeners(instance: Renderer) {
  if (vignetteStrengthElement) {
    vignetteStrengthElement.addEventListener("input", (event) => {
      instance.scene.vignetteStrength = parseFloat((<HTMLInputElement>event.target).value)
      if (vignetteStrengthValueElement) {
        vignetteStrengthValueElement.textContent = instance.scene.vignetteStrength.toString()
      }
      instance.updateImgSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
  if (vignetteRadiusElement) {
    vignetteRadiusElement.addEventListener("input", (event) => {
      instance.scene.vignetteRadius = parseFloat((<HTMLInputElement>event.target).value)
      if (vignetteRadiusValueElement) {
        vignetteRadiusValueElement.textContent = instance.scene.vignetteRadius.toString()
      }
      instance.updateImgSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
  if (fovElement) {
    fovElement.addEventListener("input", (event) => {
      instance.scene.camera.fov = parseFloat((<HTMLInputElement>event.target).value)
      if (fovValueElement) {
        fovValueElement.textContent = instance.scene.camera.fov.toString()
      }
      instance.updateCamSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }

  if (focusDistElement) {
    focusDistElement.addEventListener("input", (event) => {
      instance.scene.camera.focusDistance = parseFloat((<HTMLInputElement>event.target).value)
      if (focusDistValueElement) {
        focusDistValueElement.textContent = instance.scene.camera.focusDistance.toString()
      }
      instance.updateCamSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }

  if (apertureSizeElement) {
    apertureSizeElement.addEventListener("input", (event) => {
      instance.scene.camera.apertureSize = parseFloat((<HTMLInputElement>event.target).value)
      if (apertureSizeValueElement) {
        apertureSizeValueElement.textContent = instance.scene.camera.apertureSize.toString()
      }
      instance.updateCamSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
  if (bouncesElement) {
    bouncesElement.addEventListener("input", (event) => {
      instance.scene.maxBounces = parseFloat((<HTMLInputElement>event.target).value)
      if (bouncesValueElement) {
        bouncesValueElement.textContent = instance.scene.maxBounces.toString()
      }
      instance.updateSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }

  if (samplesElement) {
    samplesElement.addEventListener("input", (event) => {
      instance.scene.samples = parseFloat((<HTMLInputElement>event.target).value)
      if (samplesValueElement) {
        samplesValueElement.textContent = instance.scene.samples.toString()
      }
      instance.updateSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
  if (jitterElement) {
    jitterElement.addEventListener("input", (event) => {
      instance.scene.jitterScale = parseFloat((<HTMLInputElement>event.target).value)
      if (jitterValueElement) {
        jitterValueElement.textContent = instance.scene.jitterScale.toString()
      }
      instance.updateSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
  if (backfaceCullingCheckbox) {
    backfaceCullingCheckbox.addEventListener("change", () => {
      const value = backfaceCullingCheckbox.checked ? 1.0 : 0.0
      instance.scene.enableCulling = value
      instance.updateSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }

  if (skyTextureCheckbox) {
    skyTextureCheckbox.addEventListener("change", () => {
      const value = skyTextureCheckbox.checked ? 1.0 : 0.0
      instance.scene.enableSkytexture = value
      instance.updateSettings()
      instance.scene.camera.cameraIsMoving = true
    })
  }
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
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 1.5 })
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
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blueMaterial,
      position: [0.0, 2.5, -2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 0.0, 0.0],
    },
    // Lamp
    {
      modelPath: "./src/assets/models/cube.obj",
      material: glowMaterial,
      position: [0.0, 4.95, 0.0],
      scale: [0.85, 0.025, 0.85],
    },
    // Sphere
    {
      modelPath: "./src/assets/models/cube.obj",
      material: mirrorMaterial,
      position: [-1.0, 1.65, 0.75],
      rotation: [0.0, -20.5, 0.0],
      scale: [0.75, 1.65, 0.75],
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: whiteMaterial,
      position: [1.0, 0.75, -0.5],
      rotation: [0.0, 20.5, 0.0],
      scale: [0.75, 0.75, 0.75],
    },
  ]
}
export function createCornellBox2(): ObjectProperties[] {
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
      modelPath: "./src/assets/models/cube.obj",
      material: glowMaterial,
      position: [0.0, 4.95, 0.0],
      scale: [0.85, 0.025, 0.85],
    },
    // Sphere
    {
      modelPath: "./src/assets/models/cube.obj",
      material: mirrorMaterial,
      position: [-1.0, 1.65, 0.75],
      rotation: [0.0, -20.5, 0.0],
      scale: [0.75, 1.65, 0.75],
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: whiteMaterial,
      position: [1.0, 0.75, -0.5],
      rotation: [0.0, 20.5, 0.0],
      scale: [0.75, 0.75, 0.75],
    },
  ]
}
export function createCornellBox3(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
  const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
  const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 5.0 })
  const mirrorMaterial = new Material({ albedo: [0.0, 0.0, 0.0], specularRoughness: 0.02, specularChance: 1.0 })
  const glossyMaterial = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.05, specularChance: 1.0 })
  return [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blueMaterial,
      position: [0.0, 0.0, 0.0],
      scale: [0.5, 0.5, 0.5],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: redMaterial,
      position: [0.0, 5.0, 0.0],
      scale: [0.5, 0.5, 0.5],
      rotation: [180.0, 0.0, 0.0],
    },
    // Left wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorMaterial,
      position: [-2.5, 2.5, 0.0],
      scale: [0.5, 1.0, 0.5],
      rotation: [180.0, 0.0, 90.0],
    },
    // Right wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorMaterial,
      position: [2.5, 2.5, 0.0],
      scale: [0.5, 1.0, 0.5],
      rotation: [0.0, 180.0, 90.0],
    },
    // Back wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorMaterial,
      position: [0.0, 2.5, 2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 180.0, 0.0],
    },
    // Front wall
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorMaterial,
      position: [0.0, 2.5, -2.5],
      scale: [0.5, 1.0, 0.5],
      rotation: [90.0, 0.0, 0.0],
    },
    // Lamp
    {
      modelPath: "./src/assets/models/cube.obj",
      material: glowMaterial,
      position: [0.0, 4.95, 0.0],
      scale: [0.85, 0.025, 0.85],
    },
    // Donut
    {
      modelPath: "./src/assets/models/donut.obj",
      material: glossyMaterial,
      position: [0.0, 1.0, 0.0],
      rotation: [0.0, 0.0, 0.0],
      scale: [1.0, 1.0, 1.0],
    },
  ]
}
export function createCornellBox4(): ObjectProperties[] {
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const redMaterial = new Material({ albedo: [1.0, 0.0, 0.0] })
  const greenMaterial = new Material({ albedo: [0.0, 1.0, 0.0] })
  const blueMaterial = new Material({ albedo: [0.3, 0.31, 0.98] })
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 0.8, 0.6], emissionStrength: 6.5 })
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
      position: [0.0, 4.98, 0.0],
      scale: [0.2, 0.025, 0.2],
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
    ior: 1.12,
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
    refractionRoughness: 0.0,
    ior: 1.0,
  })

  const numSpheres = 9
  const ior_test: ObjectProperties[] = []

  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const ior = 1 + (0.15 * i) / (numSpheres - 1)

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
    const refl = (0.15 * i) / numSpheres
    const roughness = 1.0 - i / numSpheres
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
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

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
  const gridSize = 5
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
      const cornellBox = createCornellBox2()

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

// Dragon
export function createScene8(): ObjectProperties[] {
  // create the Materials you want to use
  const grey = new Material({ albedo: [0.84, 0.89, 0.82] })
  const shiny = new Material({ albedo: [1.0, 0.5, 0.5], specularRoughness: 0.1, specularChance: 0.52 })
  const mirror = new Material({ specularRoughness: 0.1, specularChance: 1.0 })
  const mirrorBlurry = new Material({ specularRoughness: 0.15, specularChance: 1.0 })
  const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
  const lightWeak = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 0.85], emissionStrength: 2.5 })
  const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
  const glass = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.15, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionRoughness: 0.0, // self explanatory
  })

  // create an array of objects you want to use
  const objectsToLoad: ObjectProperties[] = [
    {
      modelPath: "./src/assets/models/plane.obj",
      material: grey,
      position: [0.0, 0.0, 0.0],
      scale: [10.0, 0.1, 10.0], // Large floor plane
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorBlurry,
      rotation: [0.0, 0.0, 90.0],
      position: [5.0, 1.0, 0.0], // Mirror to the side and slightly behind the dragon
      scale: [1.5, 0.1, 1.5], // Tall vertical mirror
    },
    {
      modelPath: "./src/assets/models/dragon.obj",
      material: gold,
      position: [0.0, 0.0, 0.0], // Center of the scene
      scale: [1.0, 1.0, 1.0], // Appropriately sized dragon
      rotation: [0.0, 65.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [0.0, 8.0, 8.0], // Key light to the left and above the dragon
      scale: [0.25, 0.25, 0.25], // Smaller plane for focused light
      rotation: [45.0, 0.0, 0.0], // Angled down towards the dragon
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [0.0, 8.0, -8.0], // Fill light to the right and above the dragon
      scale: [0.25, 0.25, 0.25], // Smaller plane for softer light
      rotation: [135.0, 0.0, 0.0], // Angled down towards the dragon
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: lightSource,
      position: [-8.0, 1.0, 0.0], // Rim light directly behind the dragon
      scale: [0.2, 0.2, 4.0], // Thin, wide light for rim effect
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
  const gridSize = 10
  const halfGridSize = gridSize / 2
  const spacing = 5 // Assuming you want a fixed spacing, replace with randomInRange(5, 5) if needed

  for (let i = -halfGridSize; i <= halfGridSize; i++) {
    for (let k = -halfGridSize; k <= halfGridSize; k++) {
      // Skip the center position if you don't want an object at the exact center
      if (i === 0 && k === 0) continue

      spheres.push({
        modelPath: "./src/assets/models/monkey.obj",
        material: new Material(randomMaterial()),
        position: [i * spacing, 1.0, k * spacing],
        scale: [1.0, 1.0, 1.0],
      })
    }
  }
  spheres.push({
    modelPath: "./src/assets/models/sphere.obj",
    material: new Material({ emissionColor: [1.0, 1.0, 1.0], emissionStrength: 10 }),
    position: [0.0, 50.0, 0.0],
    scale: [25.0, 25.0, 25.0],
  })
  spheres.push({
    modelPath: "./src/assets/models/plane.obj",
    material: new Material({ specularRoughness: 0.25, specularChance: 1.0 }),
    position: [0.0, -2.0, 0.0],
    scale: [6.0, 1.0, 6.0],
  })
  return spheres
}

// Lamp
export function createScene10(): ObjectProperties[] {
  // create the Materials you want to use
  const grey = new Material({ albedo: [0.84, 0.89, 0.82] })
  const shiny = new Material({ albedo: [1.0, 0.5, 0.5], specularRoughness: 0.1, specularChance: 0.52 })
  const mirror = new Material({ specularRoughness: 0.0, specularChance: 1.0 })
  const mirrorBlurry = new Material({ specularRoughness: 0.15, specularChance: 1.0 })
  const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
  const lightWeak = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 0.85], emissionStrength: 2.5 })
  const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
  const lightSource2 = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 50.0 })
  const glass = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.25, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionRoughness: 0.0, // self explanatory
  })

  // create an array of objects you want to use
  const objectsToLoad: ObjectProperties[] = [
    {
      modelPath: "./src/assets/models/plane.obj",
      material: grey,
      position: [0.0, 0.0, 0.0],
      scale: [2.0, 2.0, 2.0],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: mirrorBlurry,
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
      material: lightSource2,
      position: [0.0, 0.0, -3],
      scale: [3.0, 3.0, 3.0],
      rotation: [0, 0.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/donut.obj",
      material: glass,
      position: [0.0, 1.0, 1.0],
      scale: [1.0, 1.0, 1.0],
    },
    /*     {
      modelPath: "./src/assets/models/statue.obj",
      material: gold,
      position: [0.0, 0.0, 1.0],
      scale: [1.2, 1.2, 1.2],
      rotation: [-90, 180.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/sphere.obj",
      material: glass,
      position: [0.0, 1, 1.0],
      scale: [2, 2, 2],
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: glass,
      position: [0.0, 1, 1.0],
      scale: [1.5, 1.5, 1.5],
    }, */
    /*     {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [-8.0, 6.0, 0.0],
      scale: [0.25, 0.25, 0.25],
      rotation: [125.0, 90.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [8.0, 6.0, 0.0],
      scale: [0.25, 0.25, 0.25],
      rotation: [65.0, 90.0, 0.0],
    },*/
    {
      modelPath: "./src/assets/models/cube.obj",
      material: lightSource,
      position: [0.0, 5.0, 5.0],
      scale: [5.0, 0.15, 0.15],
    },
  ]

  return objectsToLoad
}

export function createScene11(): ObjectProperties[] {
  // create the Materials you want to use
  const grey = new Material({ albedo: [0.84, 0.89, 0.82] })
  const shiny = new Material({ albedo: [1.0, 0.5, 0.5], specularRoughness: 0.1, specularChance: 0.52 })
  const mirror = new Material({ specularRoughness: 0.0, specularChance: 1.0 })
  const mirrorBlurry = new Material({ specularRoughness: 0.15, specularChance: 1.0 })
  const lightSource = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })
  const lightWeak = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 0.85], emissionStrength: 2.5 })
  const gold = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.5 })
  const lightSource2 = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 50.0 })
  const glass = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.5, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionRoughness: 0.0, // self explanatory
  })
  const water = new Material({
    specularChance: 0.02, // how reflective, 1.0 is 100%
    specularRoughness: 0.0, // how rough, 0.0 is 100% smooth
    ior: 1.33, // index of refraction
    refractionChance: 1.0, // how refractive/transparent, 1.0 is 100%
    refractionRoughness: 0.0, // self explanatory
  })

  // create an array of objects you want to use
  const objectsToLoad: ObjectProperties[] = [
    /*     {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [0.0, 70.0, 0.0],
      scale: [2.0, 2.0, 2.0],
      rotation: [180.0, 0.0, 0.0],
    }, */
    {
      modelPath: "./src/assets/models/plane.obj",
      material: grey,
      position: [0.0, 0.0, 0.0],
      scale: [2.0, 2.0, 2.0],
    },
    {
      modelPath: "./src/assets/models/glasswater1.obj",
      material: glass,
      position: [0.0, 0.0, 1.0],
      scale: [0.5, 0.5, 0.5],
    },
    {
      modelPath: "./src/assets/models/glasswater2.obj",
      material: water,
      position: [0.0, 0.0, 1.0],
      scale: [0.5, 0.5, 0.5],
    },
    {
      modelPath: "./src/assets/models/plane.obj",
      material: lightSource,
      position: [0.0, 4.0, -16.0], // Fill light to the right and above the dragon
      scale: [0.5, 0.5, 0.5], // Smaller plane for softer light
      rotation: [115.0, 0.0, 0.0], // Angled down towards the dragon
    },
    /*     {
      modelPath: "./src/assets/models/statue.obj",
      material: gold,
      position: [0.0, 0.0, 1.0],
      scale: [1.2, 1.2, 1.2],
      rotation: [-90, 180.0, 0.0],
    },
    {
      modelPath: "./src/assets/models/sphere.obj",
      material: glass,
      position: [0.0, 1, 1.0],
      scale: [2, 2, 2],
    },
    {
      modelPath: "./src/assets/models/cube.obj",
      material: glass,
      position: [0.0, 1, 1.0],
      scale: [1.5, 1.5, 1.5],
    }, */
  ]

  return objectsToLoad
}
export function createScene12(): ObjectProperties[] {
  // Define materials for each type of sphere
  const shinyGoldMaterial = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.7 })
  const shinyRedaterial = new Material({
    albedo: [0.8, 0.2, 1.0],
    specularColor: [1.0, 1.0, 0.0],
    specularRoughness: 0.5,
    specularChance: 0.5,
    refractionChance: 0.5,
    refractionColor: [0.0, 0.1, 0.15],
    ior: 1.15,
  })
  const emissiveMaterial = new Material({
    emissionColor: [44 / 255, 250 / 255, 31 / 255],
    emissionStrength: 0.25,
    specularRoughness: 0.0,
    refractionChance: 0.5,
    refractionRoughness: 0.15,
    ior: 1.25,
  })

  const glassMaterial = new Material({
    refractionChance: 1.0,
    ior: 1.18,
    specularChance: 0.15,
    specularColor: [0.8, 0.8, 0.8],
    specularRoughness: 0.0,
    refractionRoughness: 0.0,
  })

  const roughGlassMaterial = new Material({
    specularChance: 0.15,
    refractionChance: 1.0,
    specularRoughness: 0.1,
    refractionRoughness: 0.15,
    ior: 1.15,
  })
  const colorGlassMaterial = new Material({
    specularChance: 0.05,
    refractionChance: 1.0,
    specularRoughness: 0.0,
    refractionColor: [0.3, 0.1, 0.1],
    ior: 1.45,
  })
  const mirrorMaterial = new Material({
    albedo: [0.0, 0.0, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.0,
  })
  const mirrorRoughMaterial = new Material({
    albedo: [0.0, 0.5, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.5,
  })
  const metallicMatteMaterial = new Material({
    albedo: [0.2, 0.0, 1.0],
    specularColor: [0.8, 0.0, 0.0], // Slightly shiny
    specularRoughness: 0.3, // High roughness for a matte finish
    specularChance: 0.5, // Lower chance of specular reflection
    emissionColor: [0.2, 0.0, 1.0],
    emissionStrength: 0.25,
  })

  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  // Create spheres with these materials
  const spheres: ObjectProperties[] = []
  const numSpheres = 9
  const materials = [
    shinyGoldMaterial,
    glassMaterial,
    emissiveMaterial,
    roughGlassMaterial,
    colorGlassMaterial,
    mirrorMaterial,
    mirrorRoughMaterial,
    shinyRedaterial,
    metallicMatteMaterial,
  ]
  const paths = [
    "./src/assets/models/dragon.obj",
    "./src/assets/models/klein.obj",
    "./src/assets/models/teapot.obj",
    "./src/assets/models/sphere.obj",
    "./src/assets/models/water2.obj",
    "./src/assets/models/donut.obj",
    "./src/assets/models/horse.obj",
    "./src/assets/models/couch.obj",
    "./src/assets/models/monkey.obj",
  ]
  const sizes = [
    vec3.fromValues(0.28, 0.28, 0.28),
    vec3.fromValues(0.13, 0.13, 0.13),
    vec3.fromValues(0.12, 0.12, 0.12),
    vec3.fromValues(0.8, 0.8, 0.8),
    vec3.fromValues(0.3, 0.3, 0.3),
    vec3.fromValues(0.6, 0.6, 0.6),
    vec3.fromValues(0.65, 0.65, 0.65),
    vec3.fromValues(0.25, 0.25, 0.25),
    vec3.fromValues(0.5, 0.5, 0.5),
  ]
  const rotations = [-45, -25, 0, -55, -45, -45, -35, -45, -145]
  const height = [0.25, 0.25, 0.25, 0.7, 0.25, 0.85, 0.25, 0.3, 0.85]
  for (let i = 0; i < numSpheres; i++) {
    spheres.push({
      modelPath: paths[i],
      material: materials[i],
      position: [-4.0 + i * 1.0, height[i], 0.0],
      scale: sizes[i],
      rotation: [0.0, rotations[i], 0.0],
    })
  }

  const planes: ObjectProperties[] = [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.25, 0.0],
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

  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 2.0, 0.5],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 2.0, -0.25],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  /*   for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  } */

  for (const ball of spheres) {
    planes.push(ball)
  }

  return planes
}
const shinyGoldMaterial = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.7 })
export function createScene13(): ObjectProperties[] {
  // Define materials for each type of sphere

  const shinyRedMaterial = new Material({
    albedo: [0.8, 0.2, 1.0],
    specularColor: [1.0, 1.0, 0.0],
    specularRoughness: 0.5,
    specularChance: 0.5,
    refractionChance: 0.5,
    refractionColor: [0.0, 0.1, 0.15],
    ior: 1.15,
  })
  const emissiveMaterial = new Material({
    emissionColor: [44 / 255, 250 / 255, 31 / 255],
    emissionStrength: 0.25,
    specularRoughness: 0.0,
    refractionChance: 0.5,
    refractionRoughness: 0.15,
    ior: 1.25,
  })

  const glassMaterial = new Material({
    refractionChance: 1.0,
    ior: 1.18,
    specularChance: 0.15,
    specularColor: [0.8, 0.8, 0.8],
    specularRoughness: 0.0,
    refractionRoughness: 0.0,
  })

  const roughGlassMaterial = new Material({
    specularChance: 0.15,
    refractionChance: 1.0,
    specularRoughness: 0.1,
    refractionRoughness: 0.15,
    ior: 1.15,
  })
  const colorGlassMaterial = new Material({
    specularChance: 0.05,
    refractionChance: 1.0,
    specularRoughness: 0.0,
    refractionColor: [0.3, 0.1, 0.1],
    ior: 1.45,
  })
  const mirrorMaterial = new Material({
    albedo: [0.0, 0.0, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.0,
  })
  const mirrorRoughMaterial = new Material({
    albedo: [0.0, 0.0, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.25,
  })
  const metallicMatteMaterial = new Material({
    albedo: [0.2, 0.0, 1.0],
    specularColor: [0.8, 0.0, 0.0], // Slightly shiny
    specularRoughness: 0.3, // High roughness for a matte finish
    specularChance: 0.5, // Lower chance of specular reflection
    emissionColor: [0.2, 0.0, 1.0],
    emissionStrength: 0.25,
  })

  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [0.0, 0.0, 0.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

  const spheres: ObjectProperties[] = []

  // Starting parameters for the Sphereflake
  const startScale = vec3.fromValues(1.5, 1.5, 1.5) // Initial scale of the central sphere
  const maxDepth = 5 // Depth of recursion, adjust as needed

  // Create the Sphereflake
  const sphereflake = createSphereflake(vec3.fromValues(0.0, 0.75, -2.5), startScale, maxDepth)

  // Add the sphereflake to the spheres array
  spheres.push(...sphereflake) // Using spread operator to add all elements of sphereflake

  /*   // Object 1
  spheres.push({
    modelPath: "./src/assets/models/dragon.obj",
    material: shinyGoldMaterial,
    position: [-4.0, 0.25, 0.0],
    scale: vec3.fromValues(0.28, 0.28, 0.28),
    rotation: [0.0, -45, 0.0],
  })

  // Object 2
  spheres.push({
    modelPath: "./src/assets/models/klein.obj",
    material: glassMaterial,
    position: [-3.0, 0.25, 0.0],
    scale: vec3.fromValues(0.13, 0.13, 0.13),
    rotation: [0.0, -25, 0.0],
  }) */

  /*   // Object 3
  spheres.push({
    modelPath: "./src/assets/models/teapot.obj",
    material: shinyGoldMaterial,
    position: [0.0, 0.0, 0.0],
    scale: [0.3, 0.3, 0.3],
    rotation: [0.0, 0, 0.0],
  }) */
  /* 
  // Object 4
  spheres.push({
    modelPath: "./src/assets/models/sphere.obj",
    material: roughGlassMaterial,
    position: [-1.0, 0.7, 0.0],
    scale: vec3.fromValues(0.8, 0.8, 0.8),
    rotation: [0.0, -55, 0.0],
  });
  
  // Object 5
  spheres.push({
    modelPath: "./src/assets/models/water2.obj",
    material: colorGlassMaterial,
    position: [0.0, 0.25, 0.0],
    scale: vec3.fromValues(0.3, 0.3, 0.3),
    rotation: [0.0, -45, 0.0],
  });
  
  // Object 6
  spheres.push({
    modelPath: "./src/assets/models/donut.obj",
    material: mirrorMaterial,
    position: [1.0, 0.85, 0.0],
    scale: vec3.fromValues(0.6, 0.6, 0.6),
    rotation: [0.0, -45, 0.0],
  });
  
  // Object 7
  spheres.push({
    modelPath: "./src/assets/models/horse.obj",
    material: mirrorRoughMaterial,
    position: [2.0, 0.25, 0.0],
    scale: vec3.fromValues(0.65, 0.65, 0.65),
    rotation: [0.0, -35, 0.0],
  });
  
  // Object 8
  spheres.push({
    modelPath: "./src/assets/models/couch.obj",
    material: shinyRedMaterial,
    position: [3.0, 0.3, 0.0],
    scale: vec3.fromValues(0.25, 0.25, 0.25),
    rotation: [0.0, -45, 0.0],
  });
  
  // Object 9
  spheres.push({
    modelPath: "./src/assets/models/monkey.obj",
    material: metallicMatteMaterial,
    position: [4.0, 0.85, 0.0],
    scale: vec3.fromValues(0.5, 0.5, 0.5),
    rotation: [0.0, -145, 0.0],
  });
   */
  const planes: ObjectProperties[] = [
    // Ground
    {
      modelPath: "./src/assets/models/plane.obj",
      material: whiteMaterial,
      position: [0.0, 0.0, -2.5],
      scale: [1.0, 1.0, 1.0],
    },
    // Ceiling
    {
      modelPath: "./src/assets/models/plane.obj",
      material: blackMaterial,
      position: [0.0, 4.01, -2.5],
      scale: [1.0, 1.0, 1.0],
      rotation: [0.0, 0.0, 180.0],
    },
  ]

  for (let i = -5; i <= 5; i += 0.125) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: i % 0.25 === 0 ? mirrorRoughMaterial : mirrorMaterial,
      position: [i, 2.0, 1.2],
      scale: [0.0125, 0.15, 0.35],
      rotation: [90.0, 180.0, 0.0],
    })
  }

  const lampCount = 3
  const lampSpacing = 8 / (lampCount - 1) // 8 is the range from -4 to +4

  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, 0.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -1.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -2.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -3.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -4.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -5.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -6.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  planes.push({
    modelPath: "./src/assets/models/plane.obj",
    material: glowMaterial,
    position: [0.0, 4.0, -7.0],
    scale: [1.0, 1.0, 0.015],
    rotation: [0.0, 0.0, 180.0],
  })
  /*   for (let i = 0; i < lampCount; i++) {
    planes.push({
      modelPath: "./src/assets/models/plane.obj",
      material: glowMaterial,
      position: [-4 + i * lampSpacing, 2.0, 0.0],
      scale: [0.1, 1.0, 0.1],
      rotation: [0.0, 0.0, 180.0],
    })
  } */

  for (const ball of spheres) {
    planes.push(ball)
  }

  return planes
}
const mirrorMaterial = new Material({
  albedo: [0.0, 0.0, 0.0],
  specularChance: 1.0,
  specularRoughness: 0.0,
})
// Function to create a single sphere
function createSphere(position: vec3, scale: vec3): ObjectProperties {
  return {
    modelPath: "./src/assets/models/sphere.obj",
    material: shinyGoldMaterial,
    position: position,
    scale: scale,
  }
}
// Recursive function to create the Sphereflake fractal
function createSphereflake(position: vec3, scale: vec3, depth: number, fromDirection?: vec3): ObjectProperties[] {
  if (depth === 0) {
    return [createSphere(position, scale)]
  }

  let spheres = [createSphere(position, scale)]

  // Calculate new scale for child spheres
  let newScale = vec3.fromValues(scale[0] * 0.5, scale[1] * 0.5, scale[2] * 0.5)

  // Offset distance for child spheres, considering radius of both parent and child
  let offset = scale[0] / 2 + newScale[0] / 2

  // Directions for child spheres, excluding the direction from which this sphere was generated
  const directions = [
    vec3.fromValues(-1, 0, 0), // Left
    vec3.fromValues(1, 0, 0), // Right
    vec3.fromValues(0, 1, 0), // Top
    vec3.fromValues(0, 0, -1), // Front
    vec3.fromValues(0, 0, 1), // Back
  ]

  directions.forEach((direction) => {
    if (fromDirection && vec3.equals(direction, vec3.negate(vec3.create(), fromDirection))) {
      // Skip the opposite direction of the parent sphere
      return
    }

    let newPosition = vec3.create()
    vec3.add(newPosition, position, vec3.scale(vec3.create(), direction, offset))
    spheres = spheres.concat(createSphereflake(newPosition, newScale, depth - 1, direction))
  })
  return spheres
}

export function createScene14(): ObjectProperties[] {
  // Define materials for each type of sphere
  const shinyGoldMaterial = new Material({ albedo: [218 / 255, 133 / 255, 32 / 225], specularRoughness: 0.0, specularChance: 0.7 })
  const shinyRedaterial = new Material({
    albedo: [0.8, 0.2, 1.0],
    specularColor: [1.0, 1.0, 0.0],
    specularRoughness: 0.5,
    specularChance: 0.5,
    refractionChance: 0.5,
    refractionColor: [0.0, 0.1, 0.15],
    ior: 1.15,
  })
  const emissiveMaterial = new Material({
    emissionColor: [44 / 255, 250 / 255, 31 / 255],
    emissionStrength: 0.25,
    specularRoughness: 0.0,
    refractionChance: 0.5,
    refractionRoughness: 0.15,
    ior: 1.25,
  })

  const glassMaterial = new Material({
    refractionChance: 1.0,
    ior: 1.18,
    specularChance: 0.15,
    specularColor: [0.8, 0.8, 0.8],
    specularRoughness: 0.0,
    refractionRoughness: 0.0,
  })

  const roughGlassMaterial = new Material({
    specularChance: 0.15,
    refractionChance: 1.0,
    specularRoughness: 0.1,
    refractionRoughness: 0.15,
    ior: 1.15,
  })
  const colorGlassMaterial = new Material({
    specularChance: 0.05,
    refractionChance: 1.0,
    specularRoughness: 0.0,
    refractionColor: [0.3, 0.1, 0.1],
    ior: 1.45,
  })
  const mirrorMaterial = new Material({
    albedo: [0.0, 0.0, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.0,
  })
  const mirrorRoughMaterial = new Material({
    albedo: [0.0, 0.5, 0.0],
    specularChance: 1.0,
    specularRoughness: 0.5,
  })
  const metallicMatteMaterial = new Material({
    albedo: [0.2, 0.0, 1.0],
    specularColor: [0.8, 0.0, 0.0], // Slightly shiny
    specularRoughness: 0.3, // High roughness for a matte finish
    specularChance: 0.5, // Lower chance of specular reflection
    emissionColor: [0.2, 0.0, 1.0],
    emissionStrength: 0.25,
  })
  // Create spheres with these materials
  const spheres: ObjectProperties[] = []
  const numSpheres = 9
  const materials = [
    shinyGoldMaterial,
    glassMaterial,
    emissiveMaterial,
    roughGlassMaterial,
    colorGlassMaterial,
    mirrorMaterial,
    mirrorRoughMaterial,
    shinyRedaterial,
    metallicMatteMaterial,
  ]
  const paths = [
    "./src/assets/models/dragon.obj",
    "./src/assets/models/klein.obj",
    "./src/assets/models/teapot.obj",
    "./src/assets/models/sphere.obj",
    "./src/assets/models/water2.obj",
    "./src/assets/models/donut.obj",
    "./src/assets/models/horse.obj",
    "./src/assets/models/couch.obj",
    "./src/assets/models/monkey.obj",
  ]
  const sizes = [
    vec3.fromValues(0.28, 0.28, 0.28),
    vec3.fromValues(0.13, 0.13, 0.13),
    vec3.fromValues(0.12, 0.12, 0.12),
    vec3.fromValues(0.8, 0.8, 0.8),
    vec3.fromValues(0.3, 0.3, 0.3),
    vec3.fromValues(0.6, 0.6, 0.6),
    vec3.fromValues(0.65, 0.65, 0.65),
    vec3.fromValues(0.25, 0.25, 0.25),
    vec3.fromValues(0.5, 0.5, 0.5),
  ]
  const rotations = [-45, -25, 0, -55, -45, -45, -35, -45, -145]
  const height = [0.25, 0.25, 0.25, 0.7, 0.25, 0.85, 0.25, 0.3, 0.85]
  for (let i = 0; i < numSpheres; i++) {
    const positionX = -4.0 + i
    const rough = 1.0 - i / (numSpheres - 3)
    const refl = (0.05 * i) / (numSpheres - 3)

    spheres.push({
      modelPath: "./src/assets/models/sphere.obj",
      material: materials[i],
      position: [positionX, 0.75, 0.0],
      scale: [0.75, 0.75, 0.75],
    })
  }
  const whiteMaterial = new Material({ albedo: [1.0, 1.0, 1.0] })
  const blackMaterial = new Material({ albedo: [0.0, 0.0, 0.0] })
  const glowMaterial = new Material({ albedo: [1.0, 1.0, 1.0], emissionColor: [1.0, 1.0, 1.0], emissionStrength: 5.0 })

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

  for (const ball of spheres) {
    planes.push(ball)
  }

  return planes
}
