import { Application, SCENE_CATALOG } from '../core/app'
import { addEventListeners } from '../utils/helper'

function bindRangeSlider (inputId: string, valueId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    const value = document.getElementById(valueId)
    if (!input || !value) {
        return
    }

    const sync = () => {
        value.textContent = input.value
    }

    input.addEventListener('input', sync)
    sync()
}

function populateSceneSelect (select: HTMLSelectElement, currentSceneId: string) {
    select.innerHTML = ''

    const categories = [ ...new Set(SCENE_CATALOG.map((scene) => scene.category)) ]

    for (const category of categories) {
        const group = document.createElement('optgroup')
        group.label = category

        for (const scene of SCENE_CATALOG.filter((entry) => entry.category === category)) {
            const option = document.createElement('option')
            option.value = scene.id
            option.textContent = scene.name
            option.selected = scene.id === currentSceneId
            group.appendChild(option)
        }

        select.appendChild(group)
    }
}

function initSidebarToggle () {
    const sidebar = document.getElementById('sidebar')
    const toggle = document.getElementById('sidebarToggle')
    const overlay = document.getElementById('sidebarOverlay')

    if (!sidebar || !toggle) {
        return
    }

    const closeSidebar = () => {
        sidebar.classList.remove('open')
        overlay?.classList.remove('visible')
    }

    toggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open')
        overlay?.classList.toggle('visible', isOpen)
    })

    overlay?.addEventListener('click', closeSidebar)
}

function initThemeToggle () {
    const toggle = document.getElementById('themeToggle') as HTMLInputElement | null
    if (!toggle) {
        return
    }

    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const useDark = stored ? stored === 'dark' : prefersDark

    document.documentElement.dataset.theme = useDark ? 'dark' : 'light'
    toggle.checked = useDark

    toggle.addEventListener('change', () => {
        const theme = toggle.checked ? 'dark' : 'light'
        document.documentElement.dataset.theme = theme
        localStorage.setItem('theme', theme)
    })
}

function initToneMappingExclusivity () {
    const aces = document.getElementById('aces') as HTMLInputElement | null
    const filmic = document.getElementById('filmic') as HTMLInputElement | null

    if (!aces || !filmic) {
        return
    }

    aces.addEventListener('change', () => {
        if (aces.checked) {
            filmic.checked = false
            filmic.dispatchEvent(new Event('change'))
        }
    })

    filmic.addEventListener('change', () => {
        if (filmic.checked) {
            aces.checked = false
            aces.dispatchEvent(new Event('change'))
        }
    })
}

export function initUI (app: Application) {
    const sceneSelect = document.getElementById('sceneSelect') as HTMLSelectElement | null
    if (sceneSelect) {
        populateSceneSelect(sceneSelect, app.currentScene)

        sceneSelect.addEventListener('change', async () => {
            const success = await app.loadScene(sceneSelect.value)
            if (!success) {
                sceneSelect.value = app.currentScene
            }
        })
    }

    addEventListeners(app.rendererInstance)

    bindRangeSlider('bounces', 'bouncesValue')
    bindRangeSlider('samples', 'samplesValue')
    bindRangeSlider('fov', 'fovValue')
    bindRangeSlider('jitter', 'jitterValue')

    initSidebarToggle()
    initThemeToggle()
    initToneMappingExclusivity()

    const description = document.getElementById('sceneDescription')
    const scene = SCENE_CATALOG.find((entry) => entry.id === app.currentScene)
    if (description && scene) {
        description.textContent = scene.description
    }
}
