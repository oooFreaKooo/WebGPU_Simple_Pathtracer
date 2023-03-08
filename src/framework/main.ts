import { ObjMesh } from "../engine/obj-mesh"
import { ObjLoader } from "../engine/obj-loader"
import { Scene } from "./scene"
import { Camera } from "../engine/camera"
import { Renderer } from "../engine/renderer"
import { setTexture } from "../engine/helper"
import { CameraControls } from "./controls"

async function mainFunc() {
  // CANVAS
  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  // CAMERA + CONTROLS
  const camera = new Camera(canvas.width / canvas.height)
  const cameraControls = new CameraControls(camera, canvas)
  camera.z = 10
  camera.y = 10

  // ASSETS
  const scene = new Scene()
  const renderer = new Renderer()
  const obj = new ObjLoader()

  // INITIALIZE OBJECTS
  const carData = await obj.initialize("./models/car.obj")
  obj.clear()
  const spiderData = await obj.initialize("./models/Spider.obj")
  obj.clear()
  const bolbData = await obj.initialize("./models/bolb.obj")
  obj.clear()
  const hatData = await obj.initialize("./models/cowboy_hat.obj")
  obj.clear()
  const groundData = await obj.initialize("./models/ground.obj")
  obj.clear()
  const skyboxData = await obj.initialize("./models/skybox.obj")

  // SET TEXTURES
  const textureCar = await setTexture("./img/car_textures/280z_CarPaint_AO.png")
  const textureSpider = await setTexture("./img/despacitospidertx.png")
  const textureHat = await setTexture("./img/cowboy_hat.png")
  const textureGround = await setTexture("./img/dirt.png")
  const textureSky = await setTexture("./img/skybox.png")

  // INITIALIZE RENDERER
  renderer.init(canvas).then((success) => {
    if (!success) return
    //const texturedObjects: ObjMesh[] = []
    const car = new ObjMesh(carData, { scaleX: 3.0, scaleY: 3.0, scaleZ: 3.0 }, undefined, textureCar)
    //const spider = new ObjMesh(spiderData, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 }, undefined, textureSpider)
    //const cowboyhat = new ObjMesh(hatData, { y: 3.75, z: -2.4, scaleX: 0.8, scaleY: 0.8, scaleZ: 0.8 }, undefined, textureHat)
    const lightBolb = new ObjMesh(bolbData, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 }, { r: 1.0, g: 1.0, b: 0.0 })
    const ground = new ObjMesh(groundData, { scaleX: 50.0, scaleY: 50.0, scaleZ: 50.0 }, undefined, textureGround)
    const skybox = new ObjMesh(skyboxData, { y: -10, scaleX: 150.0, scaleY: 150.0, scaleZ: 150.0 }, undefined, textureSky)

    //texturedObjects.push(spider)
    //texturedObjects.push(cowboyhat)
    scene.add(car)
    //scene.add(spider)
    scene.add(lightBolb)
    //scene.add(cowboyhat)
    scene.add(ground)
    scene.add(skybox)

    const doFrame = () => {
      // ANIMATE
      const now = Date.now() / 1000

      // MOVE LIGHT AND LIGHT BULB
      scene.pointLightPosition[0] = Math.cos(now) * 8
      scene.pointLightPosition[1] = Math.sin(now) * 8
      scene.pointLightPosition[2] = 2
      lightBolb.x = scene.pointLightPosition[0]
      lightBolb.y = scene.pointLightPosition[1] - 0.5
      lightBolb.z = scene.pointLightPosition[2]
      // MOVE LIGHT WITH CAMERA
      //const cameraPos = camera.getCameraPosition()
      //scene.pointLightPosition[0] = cameraPos[0]
      //scene.pointLightPosition[1] = cameraPos[1]
      //scene.pointLightPosition[2] = cameraPos[2]

      //for (let c of texturedObjects) {
      //  c.rotX = Math.cos(now)
      //  c.rotY = Math.sin(now)
      //}

      // RENDER
      renderer.frame(camera, scene)
      requestAnimationFrame(doFrame)
    }
    requestAnimationFrame(doFrame)
  })

  window.onresize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    camera.aspect = canvas.width / canvas.height
    renderer.update(canvas)
  }
}
mainFunc()
