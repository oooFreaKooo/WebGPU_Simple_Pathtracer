import $ from 'jquery';
import {CheckWebGPU} from './helper';
import {Shaders} from './shaders';
import {Renderer} from "../framework/renderer";
import {Node3d} from "../framework/node-3d";
import {Object3d} from "../framework/object-3d";
import {Camera} from "../framework/camera";
import { makeCube } from './cube';



/*
$('#id-btn').on('click', ()=>{
    const color = $('#id-color').val() as string;
    CreateTriangle(color);
});
*/


const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
const renderer = new Renderer( canvas);

const root = new Node3d();
const cube = makeCube(renderer.device);
// add mesh and material data
root.attach(cube);

const camera = new Camera(canvas);


//TODO
//Projektions und View-matrix aus der Kamera laden
//Uniformbuffer anpassen/füllen
function render() {
    window.requestAnimationFrame(render);
    if (myCamera.tick()){
        myCamera.computeProjection();
    }
    renderer.render(root,camera);
}
render();


