import $ from 'jquery';
import { CheckWebGPU } from './helper';

import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Object3d } from "../framework/object-3d";
import { Camera } from "../framework/camera";
import { makeCube } from './cube';
import {parseOBJ} from '../framework/importObj';



/*
$('#id-btn').on('click', ()=>{
    const color = $('#id-color').val() as string;
    CreateTriangle(color);
});
*/

async function mainFunc() {

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const renderer = new Renderer(canvas);
    await renderer.init(canvas);
    const root = new Node3d();
    //const cube = makeCube(renderer.device);
    
    const filePath = "../src/examples/obj/Spider.obj";
    const obj = parseOBJ(renderer.device, filePath);

    // add mesh and material data
    root.attach(await obj);



    const camera = new Camera(canvas);
    function render() {
        window.requestAnimationFrame(render);
        camera.tick()

        renderer.render(root, camera);
    }
    render();
}

mainFunc();


//TODO
//Projektions und View-matrix aus der Kamera laden
//Uniformbuffer anpassen/füllen



