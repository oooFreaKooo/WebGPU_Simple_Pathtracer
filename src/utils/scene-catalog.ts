import * as presets from './preset-scenes'
import { ObjectProperties } from './preset-scenes'

export interface SceneInfo {
    id: string
    name: string
    category: string
    description: string
}

export const SCENE_CATALOG: SceneInfo[] = [
    { id: 'cornellBox', name: 'Cornell Box', category: 'Cornell', description: 'Classic box with front wall' },
    { id: 'cornellBox2', name: 'Cornell Box (Open)', category: 'Cornell', description: 'Cornell box without front wall' },
    { id: 'cornellBox3', name: 'Mirrored Cornell', category: 'Cornell', description: 'Cornell box with mirrored walls' },
    { id: 'cornellBox4', name: 'Empty Cornell', category: 'Cornell', description: 'Empty Cornell box' },
    { id: 'scene7', name: 'Cornell Wall', category: 'Cornell', description: 'Cornell box wall variant' },
    { id: 'scene1', name: 'Refraction Roughness', category: 'Material Tests', description: 'Refraction roughness test' },
    { id: 'scene2', name: 'IOR Test', category: 'Material Tests', description: 'Index of refraction comparison' },
    { id: 'scene3', name: 'Refraction Color', category: 'Material Tests', description: 'Colored refraction test' },
    { id: 'scene4', name: 'Reflection', category: 'Material Tests', description: 'Mirror reflection test' },
    { id: 'scene5', name: 'Reflection Roughness', category: 'Material Tests', description: 'Rough reflection test' },
    { id: 'scene6', name: 'Emission Color', category: 'Material Tests', description: 'Emissive color test' },
    { id: 'scene8', name: 'Dragon', category: 'Models', description: 'Stanford dragon model' },
    { id: 'scene9', name: 'Monkeys', category: 'Models', description: 'Suzanne heads with random materials' },
    { id: 'scene10', name: 'Lamp & Donut', category: 'Models', description: 'Lamp with glass donut' },
    { id: 'scene11', name: 'Glass of Water', category: 'Models', description: 'Caustics through water' },
    { id: 'scene12', name: 'Material Showcase', category: 'Models', description: 'Objects with varied materials' },
    { id: 'scene13', name: 'Sphereflake', category: 'Models', description: 'Fractal sphereflake (depth 5)' },
    { id: 'scene14', name: 'Mixed Spheres', category: 'Models', description: 'Spheres with mixed materials' },
    { id: 'scene15', name: 'DNA', category: 'Models', description: 'Double helix structure' },
]

export function buildPresetScenes (): Record<string, ObjectProperties[]> {
    return {
        cornellBox: presets.createCornellBox(),
        cornellBox2: presets.createCornellBox2(),
        cornellBox3: presets.createCornellBox3(),
        cornellBox4: presets.createCornellBox4(),
        scene1: presets.createScene1(),
        scene2: presets.createScene2(),
        scene3: presets.createScene3(),
        scene4: presets.createScene4(),
        scene5: presets.createScene5(),
        scene6: presets.createScene6(),
        scene7: presets.createScene7(),
        scene8: presets.createScene8(),
        scene9: presets.createScene9(),
        scene10: presets.createScene10(),
        scene11: presets.createScene11(),
        scene12: presets.createScene12(),
        scene13: presets.createScene13(),
        scene14: presets.createScene14(),
        scene15: presets.createScene15(),
    }
}
