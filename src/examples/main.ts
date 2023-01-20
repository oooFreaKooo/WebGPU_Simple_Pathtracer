import { Renderer } from "../framework/renderer";
import { Node3d } from "../framework/node-3d";
import { Camera } from "../framework/camera";
import { parseOBJ } from "../framework/importObj";

async function mainFunc() {
  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  await renderer.init(canvas);
  const root = new Node3d();
  //const cube = makeCube(renderer.device);

  const filePath1 = "../src/examples/obj/Spider.obj";
  const filePath2 = "../src/examples/obj/Skeleton.obj";
  const obj = parseOBJ(renderer.device, filePath2);

  // add mesh and material data
  root.attach(await obj);

  const camera = new Camera(canvas);
  function render() {
    window.requestAnimationFrame(render);
    camera.tick();

    renderer.render(root, camera);
  }
  render();
}

mainFunc();
