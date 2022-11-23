import {RenderElement} from "./render-element";
import {Node3d} from "./node-3d";
import {Object3d} from "./object-3d";
import {Camera} from "./camera";

export class Renderer {

    constructor(private canvas: HTMLCanvasElement) {
        // TODO: init rendering
    }

    public render(node: Node3d, camera: Camera) {
        const renderElements: RenderElement[] = [];
        this.parseSceneGraphRepressively(node, renderElements);
        this.renderElementList(renderElements, camera);
    }

    public parseSceneGraphRepressively(node: Node3d, renderElements: RenderElement[]) {

        // TODO:
        // iterate over all node and children
        // update transform matrices and other props

        if(node instanceof Object3d) {
            // TODO:
            // create render element
            const element = new RenderElement();
            renderElements.push(element);
        }

        for (const child of node.children) {
            this.parseSceneGraphRepressively(child, renderElements);
        }
    }

    /**
     * to be called every frame to draw the image
     */
    public renderElementList( elements: RenderElement[], camera: Camera) : void {

        for (const element of elements) {
            // TODO: render element
        }
    }
}