import { Renderer } from "../framework/renderer"
import { Node3d } from "../framework/node-3d"
import { Camera } from "../framework/camera"
import { parseOBJ } from "../framework/importObj"
import { makeCube } from "./cube"
import { Material } from "./material"

async function mainFunc() {
  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement
  const renderer = new Renderer(canvas)
  await renderer.init(canvas)
  const root = new Node3d()
  //const cube = makeCube(renderer.device);

  const filePath1 = "../src/examples/obj/Spider.obj"

  const obj = await parseOBJ(renderer.device, filePath1)

  // add mesh and material data
  root.attach(obj)
  //root.attach(await cube);

  const camera = new Camera(canvas)
  function render() {
    window.requestAnimationFrame(render)
    camera.tick()

    renderer.render(root, camera)
  }
  render()
}

mainFunc()
