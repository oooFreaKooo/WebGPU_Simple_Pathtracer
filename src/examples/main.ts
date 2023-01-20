import $ from 'jquery';
import { CheckWebGPU } from './helper';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Object3d } from "../framework/object-3d";
import { Camera } from "../framework/camera";
import { makeCube } from './cube';
import { makePyramid } from './pyramid';
import { parseOBJ } from '../framework/importObj';

//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'



/*
$('#id-btn').on('click', ()=>{
    const color = $('#id-color').val() as string;
    CreateTriangle(color);
});
*/


//const loader = new GLTFLoader();//loader.load('../../../scene.gltf', function (gltf) { root.attach(gltf.asset); });
async function mainFunc() {
    const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
    const renderer = new Renderer(canvas);
    await renderer.init(canvas);
    const root = new Node3d();
    //const cube = makeCube(renderer.device);
    let color = vec4.create();
    vec4.set(color, 0.5, 1, 1, 1);
    const filePath = "../src/examples/obj/Spider.obj";
    const filePath2 = "../src/examples/obj/cube.obj";
    const obj = await parseOBJ(renderer.device, filePath);

    //obj.material.setColor(color);
    const obj2 = await parseOBJ(renderer.device, filePath2);

    //obj2.material.setColor(color);
    const cube = makeCube(renderer.device);
    const cube2 = makeCube(renderer.device);
    const cube3 = makeCube(renderer.device);
    const pyramid = makePyramid(renderer.device);
    const pyramid2 = makePyramid(renderer.device);
    // add mesh and material data
    root.attach(cube);
    //root.attach(obj2);

    //cube.attach(cube2);
    //cube.attach(cube3);
    //cube2.attach(cube3);
    //cube.attach(pyramid);
    // cube.attach(pyramid);
    //cube.attach(pyramid2);
    // pyramid.attach(pyramid2);


    // Achsen
    let xAxis = vec3.create();
    let yAxis = vec3.create();
    let zAxis = vec3.create();
    let xz = vec3.create();
    vec3.set(xAxis, 1, 0, 0);
    vec3.set(yAxis, 0, 1, 0);
    vec3.set(zAxis, 0, 0, 1);
    vec3.add(xz, xAxis, zAxis);

    //Vektoren
    let translateVec = vec3.create();
    let scaleVec = vec3.create();
    let farbe = new Float32Array(4);
    farbe[0] = 0.7;
    farbe[1] = 0.7;
    farbe[2] = 0.7;
    farbe[3] = 1;
    //cube
    vec3.set(scaleVec, 1, 3, 1);
    cube.scaleIt(scaleVec);

    vec4.set(color, 1, 0, 0, 0);
    cube.material.setColor(color);

    //cube2
    vec3.set(scaleVec, 1, 0.33, 1);
    vec3.set(translateVec, 2, 0, 0);
    cube2.translate(translateVec);
    cube2.scaleIt(scaleVec);
    vec4.set(color, 1, 0, 1, 0);
    cube2.material.setColor(color);


    //pyramid
    vec3.set(translateVec, 0, 6, 0);
    vec3.set(scaleVec, 2, 1, 2);
    pyramid.translate(translateVec);
    //pyramid.scaleIt(scaleVec);

    //pyramid2
    pyramid2.rotate(180, xz);
    vec3.set(translateVec, 0, -6, 0);
    pyramid2.translate(translateVec);
    vec3.set(scaleVec, 2, 1, 2);

    const camera = new Camera(canvas);
    function render() {
        window.requestAnimationFrame(render);
        camera.tick();

        renderer.render(root, camera);
    }
    render();
}

mainFunc();

//TODO
//Projektions und View-matrix aus der Kamera laden
//Uniformbuffer anpassen/füllen
