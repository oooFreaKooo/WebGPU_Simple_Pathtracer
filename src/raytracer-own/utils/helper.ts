import { Renderer } from '../core/renderer'

export function Deg2Rad (theta: number): number {
    return (theta * Math.PI) / 180
}

export async function setTexture (textureUrl: string) {
    const res = await fetch(textureUrl)
    const img = await res.blob()
    const options: ImageBitmapOptions = { imageOrientation: 'flipY' }
    const imageBitmap = await createImageBitmap(img, options)
    return imageBitmap
}

// Img Output Settings
const vignetteStrengthElement = document.getElementById('vignetteStrength')
const vignetteStrengthValueElement = document.getElementById('vignetteStrengthValue')
const vignetteRadiusElement = document.getElementById('vignetteRadius')
const vignetteRadiusValueElement = document.getElementById('vignetteRadiusValue')

// Camera Settings
const fovElement = document.getElementById('fov')
const fovValueElement = document.getElementById('fovValue')
const focusDistElement = document.getElementById('focusDist')
const focusDistValueElement = document.getElementById('focusDistValue')
const apertureSizeElement = document.getElementById('apertureSize')
const apertureSizeValueElement = document.getElementById('apertureSizeValue')

// Settings
const bouncesElement = document.getElementById('bounces')
const bouncesValueElement = document.getElementById('bouncesValue')
const samplesElement = document.getElementById('samples')
const samplesValueElement = document.getElementById('samplesValue')
const skyTextureCheckbox = document.getElementById('skyTexture') as HTMLInputElement
const backfaceCullingCheckbox = document.getElementById('backfaceCulling') as HTMLInputElement
const jitterElement = document.getElementById('jitter')
const jitterValueElement = document.getElementById('jitterValue')

export function addEventListeners (instance: Renderer) {
    if (vignetteStrengthElement) {
        vignetteStrengthElement.addEventListener('input', (event) => {
            instance.scene.vignetteStrength = parseFloat((<HTMLInputElement>event.target).value)
            if (vignetteStrengthValueElement) {
                vignetteStrengthValueElement.textContent = instance.scene.vignetteStrength.toString()
            }
            instance.updateImgSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
    if (vignetteRadiusElement) {
        vignetteRadiusElement.addEventListener('input', (event) => {
            instance.scene.vignetteRadius = parseFloat((<HTMLInputElement>event.target).value)
            if (vignetteRadiusValueElement) {
                vignetteRadiusValueElement.textContent = instance.scene.vignetteRadius.toString()
            }
            instance.updateImgSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
    if (fovElement) {
        fovElement.addEventListener('input', (event) => {
            instance.scene.camera.fov = parseFloat((<HTMLInputElement>event.target).value)
            if (fovValueElement) {
                fovValueElement.textContent = instance.scene.camera.fov.toString()
            }
            instance.updateCamSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    if (focusDistElement) {
        focusDistElement.addEventListener('input', (event) => {
            instance.scene.camera.focusDistance = parseFloat((<HTMLInputElement>event.target).value)
            if (focusDistValueElement) {
                focusDistValueElement.textContent = instance.scene.camera.focusDistance.toString()
            }
            instance.updateCamSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    if (apertureSizeElement) {
        apertureSizeElement.addEventListener('input', (event) => {
            instance.scene.camera.apertureSize = parseFloat((<HTMLInputElement>event.target).value)
            if (apertureSizeValueElement) {
                apertureSizeValueElement.textContent = instance.scene.camera.apertureSize.toString()
            }
            instance.updateCamSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
    if (bouncesElement) {
        bouncesElement.addEventListener('input', (event) => {
            instance.scene.maxBounces = parseFloat((<HTMLInputElement>event.target).value)
            if (bouncesValueElement) {
                bouncesValueElement.textContent = instance.scene.maxBounces.toString()
            }
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    if (samplesElement) {
        samplesElement.addEventListener('input', (event) => {
            instance.scene.samples = parseFloat((<HTMLInputElement>event.target).value)
            if (samplesValueElement) {
                samplesValueElement.textContent = instance.scene.samples.toString()
            }
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
    if (jitterElement) {
        jitterElement.addEventListener('input', (event) => {
            instance.scene.jitterScale = parseFloat((<HTMLInputElement>event.target).value)
            if (jitterValueElement) {
                jitterValueElement.textContent = instance.scene.jitterScale.toString()
            }
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
    if (backfaceCullingCheckbox) {
        backfaceCullingCheckbox.addEventListener('change', () => {
            const value = backfaceCullingCheckbox.checked ? 1.0 : 0.0
            instance.scene.enableCulling = value
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    if (skyTextureCheckbox) {
        skyTextureCheckbox.addEventListener('change', () => {
            const value = skyTextureCheckbox.checked ? 1.0 : 0.0
            instance.scene.enableSkytexture = value
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }
}
export function linearToSRGB (x: number) {
    if (x <= 0.0031308) {
        return 12.92 * x
    }
    return 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055
}
