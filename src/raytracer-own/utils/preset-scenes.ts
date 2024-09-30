import { vec3 } from 'gl-matrix'
import { Material } from '../core/material'

export interface ObjectProperties {
    modelPath: string
    material: Material
    position?: vec3
    scale?: vec3
    rotation?: vec3
    objectID?: number
  }

const defaults: Material = {
    albedo: [ 0.8, 0.8, 0.8 ],
    specularColor: [ 1.0, 1.0, 1.0 ],
    emissionColor: [ 0.0, 0.0, 0.0 ],
    emissionStrength: 0.0,
    specularRoughness: 0.0,
    specularChance: 0.0,
    ior: 1.0,
    refractionChance: 0.0,
    refractionRoughness: 0.0,
    refractionColor: [ 0.0, 0.0, 0.0 ],
}
const whiteMaterial = new Material({ albedo: [ 1.0, 1.0, 1.0 ] })
const blackMaterial = new Material({ albedo: [ 0.0, 0.0, 0.0 ] })
const redMaterial = new Material({ albedo: [ 1.0, 0.0, 0.0 ] })
const greenMaterial = new Material({ albedo: [ 0.0, 1.0, 0.0 ] })
const blueMaterial = new Material({ albedo: [ 0.3, 0.31, 0.98 ] })
const glowMaterial = new Material({ albedo: [ 1.0, 1.0, 1.0 ], emissionColor: [ 1.0, 0.8, 0.6 ], emissionStrength: 18.0 })
const mirrorMaterial = new Material({ albedo: [ 1.0, 1.0, 1.0 ], specularRoughness: 0.05, specularChance: 1.0 })
const shinyGoldMaterial = new Material({ albedo: [ 218 / 255, 133 / 255, 32 / 225 ], specularRoughness: 0.0, specularChance: 0.5 })
const grey = new Material({ albedo: [ 0.84, 0.89, 0.82 ] })
const mirrorBlurry = new Material({ specularRoughness: 0.15, specularChance: 1.0 })
const lightSource = new Material({ albedo: [ 0.0, 0.0, 0.0 ], emissionColor: [ 1.0, 1.0, 1.0 ], emissionStrength: 5.0 })
const lightSource2 = new Material({ albedo: [ 0.0, 0.0, 0.0 ], emissionColor: [ 1.0, 1.0, 1.0 ], emissionStrength: 50.0 })
const glass = new Material({
    specularChance: 0.02,
    specularRoughness: 0.0,
    ior: 1.25,
    refractionChance: 1.0,
    refractionRoughness: 0.0,
})
const woodenFloorMaterial = new Material({
    albedo: [ 0.6, 0.4, 0.2 ],
    specularColor: [ 0.1, 0.1, 0.1 ],
    specularRoughness: 0.8,
    specularChance: 0.1,
})
const water = new Material({
    specularChance: 0.02,
    specularRoughness: 0.0,
    ior: 1.33,
    refractionChance: 1.0,
    refractionRoughness: 0.0,
})
const reflectiveSphere = new Material({
    specularChance: 0.9,
    specularRoughness: 0.05,
    ior: 2.5,
    refractionChance: 0.1,
    refractionRoughness: 0.0,
})
const glassMaterial = new Material({
    refractionChance: 1.0,
    ior: 1.18,
    specularChance: 0.15,
    specularColor: [ 0.8, 0.8, 0.8 ],
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
    refractionColor: [ 0.3, 0.1, 0.1 ],
    ior: 1.45,
})
const mirrorRoughMaterial = new Material({
    albedo: [ 0.0, 0.5, 0.0 ],
    specularChance: 1.0,
    specularRoughness: 0.5,
})
const metallicMatteMaterial = new Material({
    albedo: [ 0.2, 0.0, 1.0 ],
    specularColor: [ 0.8, 0.0, 0.0 ],
    specularRoughness: 0.3,
    specularChance: 0.5,
    emissionColor: [ 0.2, 0.0, 1.0 ],
    emissionStrength: 0.25,
})
const GlowGreenMaterial  = new Material({
    emissionColor: [ 44 / 255, 250 / 255, 31 / 255 ],
    emissionStrength: 0.25,
    specularRoughness: 0.0,
    refractionChance: 0.5,
    refractionRoughness: 0.15,
    ior: 1.25,
})
const shinyRedaterial = new Material({
    albedo: [ 0.8, 0.2, 1.0 ],
    specularColor: [ 1.0, 1.0, 0.0 ],
    specularRoughness: 0.5,
    specularChance: 0.5,
    refractionChance: 0.5,
    refractionColor: [ 0.0, 0.1, 0.15 ],
    ior: 1.15,
})
  
export function createCornellBox (): ObjectProperties[] {

    return [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 5.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
            rotation: [ 180.0, 0.0, 0.0 ],
        },
        // Left wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: redMaterial,
            position: [ -2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 180.0, 0.0, 90.0 ],
        },
        // Right wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: greenMaterial,
            position: [ 2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 0.0, 180.0, 90.0 ],
        },
        // Back wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 2.5, 2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        },
        // Front wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: blueMaterial,
            position: [ 0.0, 2.5, -2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 0.0, 0.0 ],
        },
        // Lamp
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0.0, 4.95, 0.0 ],
            scale: [ 0.85, 0.025, 0.85 ],
        },
        // Sphere
        {
            modelPath: './src/assets/models/cube.obj',
            material: mirrorMaterial,
            position: [ -1.0, 1.65, 0.75 ],
            rotation: [ 0.0, -20.5, 0.0 ],
            scale: [ 0.75, 1.65, 0.75 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: whiteMaterial,
            position: [ 1.0, 0.75, -0.5 ],
            rotation: [ 0.0, 20.5, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        },
    ]
}
export function createCornellBox2 (): ObjectProperties[] {

    return [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 5.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
            rotation: [ 180.0, 0.0, 0.0 ],
        },
        // Left wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: redMaterial,
            position: [ -2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 180.0, 0.0, 90.0 ],
        },
        // Right wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: greenMaterial,
            position: [ 2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 0.0, 180.0, 90.0 ],
        },
        // Back wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 2.5, 2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        },
        // Lamp
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0.0, 4.95, 0.0 ],
            scale: [ 0.85, 0.025, 0.85 ],
        },
        // Sphere
        {
            modelPath: './src/assets/models/cube.obj',
            material: mirrorMaterial,
            position: [ -1.0, 1.65, 0.75 ],
            rotation: [ 0.0, -20.5, 0.0 ],
            scale: [ 0.75, 1.65, 0.75 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: whiteMaterial,
            position: [ 1.0, 0.75, -0.5 ],
            rotation: [ 0.0, 20.5, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        },
    ]
}
export function createCornellBox3 (): ObjectProperties[] {
    return [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: blueMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: redMaterial,
            position: [ 0.0, 5.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
            rotation: [ 180.0, 0.0, 0.0 ],
        },
        // Left wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorMaterial,
            position: [ -2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 180.0, 0.0, 90.0 ],
        },
        // Right wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorMaterial,
            position: [ 2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 0.0, 180.0, 90.0 ],
        },
        // Back wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorMaterial,
            position: [ 0.0, 2.5, 2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        },
        // Front wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorMaterial,
            position: [ 0.0, 2.5, -2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 0.0, 0.0 ],
        },
        // Lamp
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0.0, 4.95, 0.0 ],
            scale: [ 0.85, 0.025, 0.85 ],
        },
        // Donut
        {
            modelPath: './src/assets/models/donut.obj',
            material: shinyGoldMaterial,
            position: [ 0.0, 1.0, 0.0 ],
            rotation: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 1.0 ],
        },
    ]
}
export function createCornellBox4 (): ObjectProperties[] {
    return [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 5.0, 0.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
            rotation: [ 180.0, 0.0, 0.0 ],
        },
        // Left wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: redMaterial,
            position: [ -2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 180.0, 0.0, 90.0 ],
        },
        // Right wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: greenMaterial,
            position: [ 2.5, 2.5, 0.0 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 0.0, 180.0, 90.0 ],
        },
        // Back wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 2.5, 2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        },
        // Front wall
        {
            modelPath: './src/assets/models/plane.obj',
            material: blueMaterial,
            position: [ 0.0, 2.5, -2.5 ],
            scale: [ 0.5, 1.0, 0.5 ],
            rotation: [ 90.0, 0.0, 0.0 ],
        },
        // Lamp
        {
            modelPath: './src/assets/models/plane.obj',
            material: glowMaterial,
            position: [ 0.0, 4.98, 0.0 ],
            scale: [ 0.2, 0.025, 0.2 ],
        },
    ]
}
// Refraction Roughness Test
export function createScene1 (): ObjectProperties[] {
    const numSpheres = 9
    const roughness_glass_test: ObjectProperties[] = []

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i
        const refractionRoughness = (i / (numSpheres - 1)) * 0.5

        roughness_glass_test.push({
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...glass,
                refractionRoughness: refractionRoughness,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of roughness_glass_test) {
        planes.push(ball)
    }

    return planes
}

// IOR Test
export function createScene2 (): ObjectProperties[] {
    const numSpheres = 9
    const ior_test: ObjectProperties[] = []

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i
        const ior = 1 + (0.15 * i) / (numSpheres - 1)

        ior_test.push({
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...glass,
                ior: ior,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of ior_test) {
        planes.push(ball)
    }

    return planes
}

// Refraction Color Test
export function createScene3 (): ObjectProperties[] {
    const numSpheres = 9

    const test: ObjectProperties[] = []

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i
        const absorb = i / (numSpheres + i)

        const refractionColor = vec3.fromValues(1.0, 1.0, 0.25)
        refractionColor[0] *= absorb
        refractionColor[1] *= absorb
        refractionColor[2] *= absorb
        test.push({
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...glass,
                refractionColor: refractionColor,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of test) {
        planes.push(ball)
    }

    return planes
}

// Reflection Test
export function createScene4 (): ObjectProperties[] {
    const numSpheres = 9
    const refl_test: ObjectProperties[] = []

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i
        const refl = (0.15 * i) / numSpheres
        const roughness = 1.0 - i / numSpheres
        refl_test.push({
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...shinyGoldMaterial,
                specularChance: refl,
                specularRoughness: roughness,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of refl_test) {
        planes.push(ball)
    }

    return planes
}
// Reflection roughtness Test
export function createScene5 (): ObjectProperties[] {
    const numSpheres = 9
    const refl_test: ObjectProperties[] = []

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i
        const rough = 1.0 - i / (numSpheres - 3)
        const refl = (0.05 * i) / (numSpheres - 3)

        refl_test.push({
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...shinyGoldMaterial,
                specularRoughness: refl,
                specularChance: rough,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.05, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of refl_test) {
        planes.push(ball)
    }

    return planes
}
// Emission Color Test
export function createScene6 (): ObjectProperties[] {
    const numSpheres = 9
    const test: ObjectProperties[] = []

    // Define rainbow colors
    const rainbowColors = [
        [ 1.0, 0.0, 0.0 ], // Red
        [ 1.0, 0.65, 0.0 ], // Orange
        [ 1.0, 1.0, 0.0 ], // Yellow
        [ 0.0, 1.0, 0.0 ], // Green
        [ 0.0, 0.0, 1.0 ], // Blue
        [ 0.75, 0.0, 1.0 ], // Indigo
        [ 0.58, 0.0, 0.83 ], // Violet
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
            modelPath: './src/assets/models/sphere.obj',
            material: {
                ...grey,
                emissionColor: emissionVec3,
                emissionStrength: 1.0,
            },
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }
    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    for (const ball of test) {
        planes.push(ball)
    }

    return planes
}

// Cornell Box wall Test
export function createScene7 (): ObjectProperties[] {
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
export function createScene8 (): ObjectProperties[] {
    const objectsToLoad: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/plane.obj',
            material: grey,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 10.0, 0.1, 10.0 ],
        },
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorBlurry,
            rotation: [ 0.0, 0.0, 90.0 ],
            position: [ 5.0, 1.0, 0.0 ],
            scale: [ 1.5, 0.1, 1.5 ],
        },
        {
            modelPath: './src/assets/models/dragon.obj',
            material: shinyGoldMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 1.0 ],
            rotation: [ 0.0, 65.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/plane.obj',
            material: lightSource,
            position: [ 0.0, 8.0, 8.0 ],
            scale: [ 0.25, 0.25, 0.25 ],
            rotation: [ 45.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/plane.obj',
            material: lightSource,
            position: [ 0.0, 8.0, -8.0 ],
            scale: [ 0.25, 0.25, 0.25 ],
            rotation: [ 135.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: lightSource,
            position: [ -8.0, 1.0, 0.0 ],
            scale: [ 0.2, 0.2, 4.0 ],
        },
    ]

    return objectsToLoad
}

function randomInRange (min: number, max: number): number {
    return Math.random() * (max - min) + min
}

function randomMaterial (): Material {
    return {
        ...defaults,
        albedo: [ randomInRange(0.5, 1), randomInRange(0.5, 1), randomInRange(0.5, 1) ],
        specularColor: [ randomInRange(0, 1), randomInRange(0, 1), randomInRange(0, 1) ],
        specularRoughness: randomInRange(0, 1),
        specularChance: randomInRange(0, 1),
        ior: randomInRange(1, 2),
        refractionChance: randomInRange(0.5, 1),
        refractionRoughness: randomInRange(0, 1),
    }
}

// Random Material Monkeys
export function createScene9 (): ObjectProperties[] {
    const spheres: ObjectProperties[] = []
    const gridSize = 10
    const halfGridSize = gridSize / 2
    const spacing = 5 // Assuming you want a fixed spacing, replace with randomInRange(5, 5) if needed

    for (let i = -halfGridSize; i <= halfGridSize; i++) {
        for (let k = -halfGridSize; k <= halfGridSize; k++) {
            // Skip the center position if you don't want an object at the exact center
            if (i === 0 && k === 0) {continue}

            spheres.push({
                modelPath: './src/assets/models/monkey.obj',
                material: new Material(randomMaterial()),
                position: [ i * spacing, 1.0, k * spacing ],
                scale: [ 1.0, 1.0, 1.0 ],
            })
        }
    }
    spheres.push({
        modelPath: './src/assets/models/sphere.obj',
        material: new Material({ emissionColor: [ 1.0, 1.0, 1.0 ], emissionStrength: 10 }),
        position: [ 0.0, 50.0, 0.0 ],
        scale: [ 25.0, 25.0, 25.0 ],
    })
    spheres.push({
        modelPath: './src/assets/models/plane.obj',
        material: new Material({ specularRoughness: 0.25, specularChance: 1.0 }),
        position: [ 0.0, -2.0, 0.0 ],
        scale: [ 6.0, 1.0, 6.0 ],
    })
    return spheres
}

// Lamp
export function createScene10 (): ObjectProperties[] {
    // create an array of objects you want to use
    const objectsToLoad: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/plane.obj',
            material: grey,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 2.0, 2.0, 2.0 ],
        },
        {
            modelPath: './src/assets/models/plane.obj',
            material: mirrorBlurry,
            rotation: [ 90.0, 0.0, 90.0 ],
            position: [ 0.0, 0.0, 5 ],
            scale: [ 1.0, 1.0, 1.0 ],
        },
        {
            modelPath: './src/assets/models/lamp_piece1.obj',
            material: shinyGoldMaterial,
            position: [ 0.0, 0.0, -3 ],
            scale: [ 3.0, 3.0, 3.0 ],
            rotation: [ 0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/lamp_piece2.obj',
            material: grey,
            position: [ 0.0, 0.0, -3 ],
            scale: [ 3.0, 3.0, 3.0 ],
            rotation: [ 0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/lamp_piece3.obj',
            material: lightSource2,
            position: [ 0.0, 0.0, -3 ],
            scale: [ 3.0, 3.0, 3.0 ],
            rotation: [ 0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/donut.obj',
            material: glass,
            position: [ 0.0, 1.0, 1.0 ],
            scale: [ 1.0, 1.0, 1.0 ],
        },
        /*     {
      modelPath: "./src/assets/models/statue.obj",
      material: shinyGoldMaterial,
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
            modelPath: './src/assets/models/cube.obj',
            material: lightSource,
            position: [ 0.0, 5.0, 5.0 ],
            scale: [ 5.0, 0.15, 0.15 ],
        },
    ]

    return objectsToLoad
}

export function createScene11 (): ObjectProperties[] {
    const objectsToLoad: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/plane.obj',
            material: woodenFloorMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 2.0, 2.0, 2.0 ],
        },
        {
            modelPath: './src/assets/models/glasswater1.obj',
            material: glass,
            position: [ 0.0, 0.0, 1.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        {
            modelPath: './src/assets/models/glasswater2.obj',
            material: water,
            position: [ 0.0, 0.0, 1.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        {
            modelPath: './src/assets/models/sphere.obj',
            material: reflectiveSphere,
            position: [ 2.0, 0.25, 1.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        {
            modelPath: './src/assets/models/sphere.obj',
            material: reflectiveSphere,
            position: [ 2.7, 0.25, 1.6 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        {
            modelPath: './src/assets/models/sphere.obj',
            material: reflectiveSphere,
            position: [ 1.64, 0.25, 1.7 ],
            scale: [ 0.5, 0.5, 0.5 ],
        },
        {
            modelPath: './src/assets/models/plane.obj',
            material: lightSource,
            position: [ 0.0, 4.0, -16.0 ],
            scale: [ 0.5, 0.5, 0.5 ],
            rotation: [ 115.0, 0.0, 0.0 ],
        },
    ]

    return objectsToLoad
}

export function createScene12 (): ObjectProperties[] {

    // Create spheres with these materials
    const spheres: ObjectProperties[] = []
    const numSpheres = 9
    const materials = [
        shinyGoldMaterial,
        glassMaterial,
        GlowGreenMaterial ,
        roughGlassMaterial,
        colorGlassMaterial,
        mirrorMaterial,
        mirrorRoughMaterial,
        shinyRedaterial,
        metallicMatteMaterial,
    ]
    const paths = [
        './src/assets/models/dragon.obj',
        './src/assets/models/klein.obj',
        './src/assets/models/teapot.obj',
        './src/assets/models/sphere.obj',
        './src/assets/models/water2.obj',
        './src/assets/models/donut.obj',
        './src/assets/models/horse.obj',
        './src/assets/models/couch.obj',
        './src/assets/models/monkey.obj',
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
    const rotations = [ -45, -25, 0, -55, -45, -45, -35, -45, -145 ]
    const height = [ 0.25, 0.25, 0.25, 0.7, 0.25, 0.85, 0.25, 0.3, 0.85 ]
    for (let i = 0; i < numSpheres; i++) {
        spheres.push({
            modelPath: paths[i],
            material: materials[i],
            position: [ -4.0 + i * 1.0, height[i], 0.0 ],
            scale: sizes[i],
            rotation: [ 0.0, rotations[i], 0.0 ],
        })
    }

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.25, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.01, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 2.0, 0.5 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 2.0, -0.25 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })

    for (const ball of spheres) {
        planes.push(ball)
    }

    return planes
}

export function createScene13 (): ObjectProperties[] {
    const spheres: ObjectProperties[] = []

    // Starting parameters for the Sphereflake
    const startScale = vec3.fromValues(1.5, 1.5, 1.5) // Initial scale of the central sphere
    const maxDepth = 4 // Depth of recursion, adjust as needed

    // Create the Sphereflake
    const sphereflake = createSphereflake(vec3.fromValues(0.0, 0.75, -2.5), startScale, maxDepth)

    // Add the sphereflake to the spheres array
    spheres.push(...sphereflake)

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, -2.5 ],
            scale: [ 1.0, 1.0, 1.0 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 4.01, -2.5 ],
            scale: [ 1.0, 1.0, 1.0 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? mirrorRoughMaterial : mirrorMaterial,
            position: [ i, 2.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.35 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, 0.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -1.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -2.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -3.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -4.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -5.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -6.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })
    planes.push({
        modelPath: './src/assets/models/plane.obj',
        material: glowMaterial,
        position: [ 0.0, 4.0, -7.0 ],
        scale: [ 1.0, 1.0, 0.015 ],
        rotation: [ 0.0, 0.0, 180.0 ],
    })

    for (const ball of spheres) {
        planes.push(ball)
    }

    return planes
}
// Function to create a single sphere
function createSphere (position: vec3, scale: vec3): ObjectProperties {
    return {
        modelPath: './src/assets/models/sphere.obj',
        material: shinyGoldMaterial,
        position: position,
        scale: scale,
    }
}
// Recursive function to create the Sphereflake fractal
function createSphereflake (position: vec3, scale: vec3, depth: number, fromDirection?: vec3): ObjectProperties[] {
    if (depth === 0) {
        return [ createSphere(position, scale) ]
    }

    let spheres = [ createSphere(position, scale) ]

    // Calculate new scale for child spheres
    const newScale = vec3.fromValues(scale[0] * 0.5, scale[1] * 0.5, scale[2] * 0.5)

    // Offset distance for child spheres, considering radius of both parent and child
    const offset = scale[0] / 2 + newScale[0] / 2

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

        const newPosition = vec3.create()
        vec3.add(newPosition, position, vec3.scale(vec3.create(), direction, offset))
        spheres = spheres.concat(createSphereflake(newPosition, newScale, depth - 1, direction))
    })
    return spheres
}

export function createScene14 (): ObjectProperties[] {

    // Create spheres with these materials
    const spheres: ObjectProperties[] = []
    const numSpheres = 9
    const materials = [
        shinyGoldMaterial,
        glassMaterial,
        GlowGreenMaterial ,
        roughGlassMaterial,
        colorGlassMaterial,
        mirrorMaterial,
        mirrorRoughMaterial,
        shinyRedaterial,
        metallicMatteMaterial,
    ]

    for (let i = 0; i < numSpheres; i++) {
        const positionX = -4.0 + i

        spheres.push({
            modelPath: './src/assets/models/sphere.obj',
            material: materials[i],
            position: [ positionX, 0.75, 0.0 ],
            scale: [ 0.75, 0.75, 0.75 ],
        })
    }
    const whiteMaterial = new Material({ albedo: [ 1.0, 1.0, 1.0 ] })
    const blackMaterial = new Material({ albedo: [ 0.0, 0.0, 0.0 ] })
    const glowMaterial = new Material({ albedo: [ 1.0, 1.0, 1.0 ], emissionColor: [ 1.0, 1.0, 1.0 ], emissionStrength: 5.0 })

    const planes: ObjectProperties[] = [
    // Ground
        {
            modelPath: './src/assets/models/plane.obj',
            material: whiteMaterial,
            position: [ 0.0, 0.0, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
        },
        // Ceiling
        {
            modelPath: './src/assets/models/plane.obj',
            material: blackMaterial,
            position: [ 0.0, 2.05, 0.0 ],
            scale: [ 1.0, 1.0, 0.25 ],
            rotation: [ 0.0, 0.0, 180.0 ],
        },
    ]

    for (let i = -5; i <= 5; i += 0.125) {
        planes.push({
            modelPath: './src/assets/models/plane.obj',
            material: i % 0.25 === 0 ? whiteMaterial : blackMaterial,
            position: [ i, 1.0, 1.2 ],
            scale: [ 0.0125, 0.15, 0.15 ],
            rotation: [ 90.0, 180.0, 0.0 ],
        })
    }

    const lampWidth = 0.1
    const lampLength = 5.0
    const lampHeight = 0.0125
    
    const lamps: ObjectProperties[] = [
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, -0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        },
        {
            modelPath: './src/assets/models/cube.obj',
            material: glowMaterial,
            position: [ 0, 1.98, 0.5 ],
            scale: [ lampLength, lampHeight, lampWidth ],
            rotation: [ 0.0, 0.0, 0.0 ],
        }
    ]
    
    for (const lamp of lamps) {
        planes.push(lamp)
    }

    for (const ball of spheres) {
        planes.push(ball)
    }

    return planes
}

export function createScene15 (): ObjectProperties[] {
    const createGlowMaterial = (r: number, g: number, b: number, strength: number) =>
        new Material({ emissionColor: [ r, g, b ], emissionStrength: strength })

    const createDynamicMaterial = (i: number) =>
        createGlowMaterial(
            Math.sin(i * 0.1) * 0.5 + 0.5,
            Math.sin(i * 0.1 + Math.PI / 3) * 0.5 + 0.5,
            Math.sin(i * 0.1 + (2 * Math.PI) / 3) * 0.5 + 0.5,
            5.0,
        )

    const objectsToLoad: ObjectProperties[] = []

    const numSpheres = 200
    const angleIncrement = (24 * Math.PI) / numSpheres

    // Spiral of glowing spheres
    for (let i = 0; i < numSpheres; i++) {
        const angle = i * angleIncrement
        const x = 5 * Math.sin(4 * angle) * Math.cos(angle)
        const z = 5 * Math.sin(4 * angle) * Math.sin(angle)
        const y = 5 * Math.cos(4 * angle)

        objectsToLoad.push({
            modelPath: './src/assets/models/sphere.obj',
            material: createDynamicMaterial(i),
            position: new Float32Array([ x, y, z ]),
            scale: new Float32Array([ 0.4, 0.4, 0.4 ]),
        })
    }

    // Fractal arrangement using other shapes
    const fractalDepth = 3
    const fractalScale = 2.5

    const createFractal = (modelPath: string, material: Material, position: Float32Array, scale: Float32Array, depth: number) => {
        if (depth === 0) {return}

        objectsToLoad.push({
            modelPath,
            material,
            position,
            scale,
        })

        const nextScale = new Float32Array(scale.map((s) => s / fractalScale))

        for (const dx of [ -1, 1 ]) {
            for (const dy of [ -1, 1 ]) {
                for (const dz of [ -1, 1 ]) {
                    const nextPosition = new Float32Array([ position[0] + dx * scale[0], position[1] + dy * scale[1], position[2] + dz * scale[2] ])

                    createFractal(modelPath, material, nextPosition, nextScale, depth - 1)
                }
            }
        }
    }

    const fractalMaterials = Array.from({ length: 5 }, (_, i) => createDynamicMaterial(i))

    fractalMaterials.forEach((material) => {
        createFractal('./src/assets/models/cube.obj', material, new Float32Array([ 0.0, 0.0, 0.0 ]), new Float32Array([ 1.0, 1.0, 1.0 ]), fractalDepth)
    })

    // Adding a large central glass object
    objectsToLoad.push({
        modelPath: './src/assets/models/glass.obj',
        material: new Material({
            refractionChance: 1.0,
            ior: 1.18,
            specularChance: 0.15,
            specularColor: [ 0.8, 0.8, 0.8 ],
            specularRoughness: 0.0,
            refractionRoughness: 0.0,
        }),
        position: new Float32Array([ 0.0, 0.0, 0.0 ]),
        scale: new Float32Array([ 3.0, 3.0, 3.0 ]),
    })

    return objectsToLoad
}
