import $ from 'jquery';
import { CheckWebGPU } from './helper';
import { mat4, vec3 } from 'gl-matrix';
import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Object3d } from "../framework/object-3d";
import { Camera } from "../framework/camera";
import { makeCube } from './cube';
import { makePyramid } from './pyramid';
//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'



/*
$('#id-btn').on('click', ()=>{
    const color = $('#id-color').val() as string;
    CreateTriangle(color);
});
*/


//const loader = new GLTFLoader();//loader.load('../../../scene.gltf', function (gltf) { root.attach(gltf.asset); });
async function mainFunc() {
    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const renderer = new Renderer(canvas);
    await renderer.init(canvas);
    const root = new Node3d();
    const cube = makeCube(renderer.device);
    const cube2 = makeCube(renderer.device);
    const cube3 = makeCube(renderer.device);
    const pyramid = makePyramid(renderer.device);
    const pyramid2 = makePyramid(renderer.device);
    // add mesh and material data
    root.attach(cube);
    let xAxis = vec3.create();
    let yAxis = vec3.create();
    let zAxis = vec3.create();
    let translateVec = vec3.create();
    let scaleVec = vec3.create();
    let scaleVec2 = vec3.create();
    vec3.set(xAxis, 1, 0, 0);
    vec3.set(yAxis, 1, 1, 0);
    vec3.set(zAxis, 0, 0, 1);
    vec3.set(translateVec, 2, 2, 0);
    vec3.set(scaleVec, 0.3, 0.3, 0.3);
    vec3.set(scaleVec2, 1.5, 1.5, 1);
    let temp = vec3.create();
    vec3.set(temp, 1, 2, 4);
    cube.attach(cube2);
    cube2.attach(cube3);
    cube3.attach(pyramid);
    cube2.attach(pyramid2);
    cube3.translate(temp);
    cube2.translate(translateVec);
    cube2.rotate(180, xAxis);
    cube2.scaleIt(scaleVec2);
    pyramid2.scaleIt(scaleVec2);
    vec3.set(temp, 1, 0, 0);
    pyramid.translate(temp);
    vec3.set(temp, 0, 2, 0); // es geht kaputt wenn wir einen knoten ändern, zum beispiel cube skalieren, dann verschwinden alle andern, die daran attached sind
    vec3.set(scaleVec, 2, 2, 2);
    pyramid2.translate(temp);
    pyramid2.scaleIt(scaleVec2);
    pyramid2.rotate(180, yAxis);
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



