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
const gammaCheckbox = document.getElementById('gamma') as HTMLInputElement
const acesCheckbox = document.getElementById('aces') as HTMLInputElement
const filmicCheckbox = document.getElementById('filmic') as HTMLInputElement

// Camera Settings
const fovElement = document.getElementById('fov')
const fovValueElement = document.getElementById('fovValue')

// Settings
const bouncesElement = document.getElementById('bounces')
const bouncesValueElement = document.getElementById('bouncesValue')
const samplesElement = document.getElementById('samples')
const samplesValueElement = document.getElementById('samplesValue')
const skyModeSelect = document.getElementById('skyMode') as HTMLSelectElement
const backfaceCullingCheckbox = document.getElementById('backfaceCulling') as HTMLInputElement
const jitterElement = document.getElementById('jitter')
const jitterValueElement = document.getElementById('jitterValue')

export function addEventListeners (instance: Renderer) {
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

    if (skyModeSelect) {
        skyModeSelect.addEventListener('change', () => {
            const value = parseInt(skyModeSelect.value)
            instance.scene.skyMode = value
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    
    if (gammaCheckbox) {
        gammaCheckbox.addEventListener('change', () => {
            const value = gammaCheckbox.checked ? 1.0 : 0.0
            instance.scene.enableGammaCorrection = value
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    
    if (acesCheckbox) {
        acesCheckbox.addEventListener('change', () => {
            const value = acesCheckbox.checked ? 1.0 : 0.0
            instance.scene.enableACES = value
            instance.updateSettings()
            instance.scene.camera.cameraIsMoving = true
        })
    }

    if (filmicCheckbox) {
        filmicCheckbox.addEventListener('change', () => {
            const value = filmicCheckbox.checked ? 1.0 : 0.0
            instance.scene.enableFilmic = value
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
