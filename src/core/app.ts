import * as presets from '../utils/preset-scenes'
import { Scene } from './scene'
import { Renderer } from './renderer'
import { ObjectProperties } from '../utils/preset-scenes'


export class Application {
    private canvas: HTMLCanvasElement
    private renderer: Renderer
    private scene: Scene

    constructor (canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.scene = new Scene(canvas)
        this.renderer = new Renderer(this.canvas, this.scene)
    }

    // Start the application with a default scene or select a scene externally
    async start () {
        
        // Public preset scenes available for selection
        const presetScenes: { [key: string]: ObjectProperties[] } = {
            cornellBox: presets.createCornellBox(),        // Cornell box with a front wall
            cornellBox2: presets.createCornellBox2(),      // Cornell box without the front wall
            cornellBox3: presets.createCornellBox3(),      // Cornell box with mirrored walls
            cornellBox4: presets.createCornellBox4(),      // Empty Cornell box
            scene1: presets.createScene1(),                // Refraction roughness test
            scene2: presets.createScene2(),                // IOR test
            scene3: presets.createScene3(),                // Refraction color test
            scene4: presets.createScene4(),                // Reflection test
            scene5: presets.createScene5(),                // Reflection roughness test
            scene6: presets.createScene6(),                // Emission color test
            scene7: presets.createScene7(),                // Cornell boxes wall
            scene8: presets.createScene8(),                // Dragon model
            scene9: presets.createScene9(),                // Monkeys with random materials
            scene10: presets.createScene10(),              // Lamp with glass donut
            scene11: presets.createScene11(),              // Glass of water with caustics
            scene12: presets.createScene12(),              // Objects with different materials
            scene13: presets.createScene13(),              // Sphereflake fractal (depth = 5)
            scene14: presets.createScene14(),              // Spheres with mixed materials
            scene15: presets.createScene15(),              // DNA
        }
        // Directly use a preset scene like cornellBox (or any scene of your choice)
        await this.scene.createObjects(presetScenes.cornellBox)

        // Initialize the renderer
        await this.renderer.Initialize()
    }
}
