import $ from 'jquery';
import { CheckWebGPU } from './helper';
import { mat4, vec3 } from 'gl-matrix';
import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Object3d } from "../framework/object-3d";
import { Camera } from "../framework/camera";
import { makeCube } from './cube';
import { makePyramid } from './pyramid';



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
    const cube = makeCube(renderer.device);
    const cube2 = makeCube(renderer.device);
    const cube3 = makeCube(renderer.device);
    const pyramid = makePyramid(renderer.device);
    // add mesh and material data
    root.attach(cube);
    cube.attach(cube2);
    cube.attach(cube3);
    cube.attach(pyramid);

    let xAxis = vec3.create();
    let translateVec = vec3.create();
    let scaleVec = vec3.create();
    vec3.set(xAxis, 1, 0, 0);
    vec3.set(translateVec, 4, 3, 0);
    vec3.set(scaleVec, 1.5, 1.5, 1);
    let temp = vec3.create();
    vec3.set(temp, 1, 2, 4);
    cube3.translate(temp);
    cube2.translate(translateVec);
    cube2.rotate(45, xAxis);
    cube2.scaleIt(scaleVec);
    vec3.set(temp, 4, 0, 0);
    pyramid.translate(temp);
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



