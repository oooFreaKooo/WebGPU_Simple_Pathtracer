import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Camera } from "../framework/camera";
import { parseOBJ } from "../framework/importObj";
import { loadFBX } from "../framework/importFBX";
import { makeCube } from "./cube";
import { Material } from "./material";

async function mainFunc() {
  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  await renderer.init(canvas);
  const root = new Node3d();
  //const cube = makeCube(renderer.device);

  const filePath1 = "../src/examples/obj/Spider.obj";
  const filePath2 = "../src/examples/obj/Zbot_Animation.fbx";
  const obj = parseOBJ(renderer.device, filePath1);
  const fbx = loadFBX(filePath2, renderer.device);

  // add mesh and material data
  root.attach(await obj);
  //root.attach(cube);

  const camera = new Camera(canvas);
  function render() {
    window.requestAnimationFrame(render);
    camera.tick();

    renderer.render(root, camera);
  }
  render();
}

mainFunc();
