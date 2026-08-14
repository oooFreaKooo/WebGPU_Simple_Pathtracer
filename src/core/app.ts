import { Scene } from './scene'
import { Renderer } from './renderer'
import { buildPresetScenes, SCENE_CATALOG } from '../utils/scene-catalog'
import { ObjectProperties } from '../utils/preset-scenes'

export { SCENE_CATALOG } from '../utils/scene-catalog'

export class Application {
    private canvas: HTMLCanvasElement
    private renderer: Renderer
    private scene: Scene
    private presetScenes: Record<string, ObjectProperties[]>
    private currentSceneId = 'scene1'
    private loadingScene = false

    constructor (canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.scene = new Scene(canvas)
        this.renderer = new Renderer(this.canvas, this.scene)
        this.presetScenes = buildPresetScenes()
    }

    get currentScene () {
        return this.currentSceneId
    }

    get isLoadingScene () {
        return this.loadingScene
    }

    get rendererInstance () {
        return this.renderer
    }

    async start (initialSceneId = 'scene1') {
        await this.loadScene(initialSceneId, { skipReload: true })
        await this.renderer.Initialize()
    }

    async loadScene (sceneId: string, options: { skipReload?: boolean } = {}) {
        if (this.loadingScene || !this.presetScenes[sceneId]) {
            return false
        }

        this.loadingScene = true
        this.setLoadingState(true)

        try {
            this.scene.reset()
            await this.scene.createObjects(this.presetScenes[sceneId])
            this.currentSceneId = sceneId

            if (!options.skipReload && this.renderer.initialized) {
                await this.renderer.reloadScene()
            }

            this.updateSceneDescription(sceneId)
            return true
        } finally {
            this.loadingScene = false
            this.setLoadingState(false)
        }
    }

    private setLoadingState (loading: boolean) {
        const overlay = document.getElementById('loadingOverlay')
        const sceneSelect = document.getElementById('sceneSelect') as HTMLSelectElement | null
        if (overlay) {
            overlay.classList.toggle('visible', loading)
        }
        if (sceneSelect) {
            sceneSelect.disabled = loading
        }
    }

    private updateSceneDescription (sceneId: string) {
        const description = document.getElementById('sceneDescription')
        const scene = SCENE_CATALOG.find((entry) => entry.id === sceneId)
        if (description && scene) {
            description.textContent = scene.description
        }
    }
}
