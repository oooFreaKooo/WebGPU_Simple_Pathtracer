import { Application } from './core/app'
import { initUI } from './ui/panel'

const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

function setupCanvas (container: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.id = 'renderCanvas'
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    container.appendChild(canvas)
    return canvas
}

async function mainFunc () {
    const container = document.getElementById('canvasContainer')
    if (!container) {
        throw new Error('Canvas container not found')
    }

    const canvas = setupCanvas(container)
    const app = new Application(canvas)

    initUI(app)
    await app.start('scene1')
}

mainFunc().catch((error: unknown) => {
    console.error('Failed to start application:', error)
    const overlay = document.getElementById('loadingOverlay')
    if (overlay) {
        overlay.classList.add('visible', 'error')
        const label = overlay.querySelector('.loading-label')
        if (label) {
            label.textContent = 'Failed to initialize WebGPU renderer'
        }
    }
})
