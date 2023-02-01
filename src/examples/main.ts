import { Renderer } from "../framework/renderer"
import { Node3d } from "../framework/node-3d"
import { Camera } from "../framework/camera"
import { parseOBJ } from "../framework/importObj"
import { Material } from "./material"
import { vec3 } from "gl-matrix"

const objects = [
  { path: "../src/examples/obj/Spider.obj", texture: "../src/examples/obj/despacitospidertx.png" },
  { path: "../src/examples/obj/oldapple.obj", texture: "../src/examples/obj/oldapple_oldapple.jpg" },
  { path: "../src/examples/obj/chair.obj", texture: "../src/examples/obj/oldapple_oldapple.jpg" },
  { path: "../src/examples/obj/burger.obj", texture: "../src/examples/obj/oldapple_oldapple.jpg" },
]

let currentObjectIndex = 0

async function mainFunc() {
  const canvas = document.getElementById("canvas-webgpu") as HTMLCanvasElement
  const renderer = new Renderer(canvas)
  await renderer.init(canvas)
  const root = new Node3d()
  const camera = new Camera(canvas)

  let obj = await parseOBJ(renderer.device, objects[currentObjectIndex].path, objects[currentObjectIndex].texture)

  root.attach(obj)
  root.rotate(vec3.fromValues(0, 1, 0), Math.PI / 256)

  const selector = document.getElementById("object-selector") as HTMLSelectElement
  selector.addEventListener("change", async () => {
    currentObjectIndex = parseInt(selector.value)
    obj = await parseOBJ(renderer.device, objects[currentObjectIndex].path, objects[currentObjectIndex].texture)
    root.clearChildren()
    root.attach(obj)
  })

  async function render() {
    window.requestAnimationFrame(render)
    camera.tick()
    renderer.render(root, camera)
  }
  render()
}
mainFunc()
