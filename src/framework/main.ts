import { ObjMesh } from "../engine/obj-mesh"
import { ObjLoader } from "../engine/obj-loader"
import { Scene } from "./scene"
import { Camera } from "../engine/camera"
import { Renderer } from "../engine/renderer"
import { setTexture } from "../engine/helper"
import { Controls } from "./controls"
import { Node3d } from "../engine/newnode"
import { vec3 } from "gl-matrix"
import { Material } from "../engine/material"

async function mainFunc() {
  // CANVAS
  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  // CAMERA + CONTROLS
  const camera = new Camera(canvas.width / canvas.height)
  const cameraControls = new Controls(camera)
  camera.z = 10
  camera.y = 10

  // ASSETS
  const scene = new Scene()
  const renderer = new Renderer()
  const obj = new ObjLoader()
  const root = new Node3d()

  // INITIALIZE OBJECTS

  const spiderData = await obj.initialize("./models/Spider.obj")
  obj.clear()
  const lightbulbData = await obj.initialize("./models/lightbulb.obj")
  obj.clear()
  const hatData = await obj.initialize("./models/cowboy_hat.obj")
  obj.clear()
  const groundData = await obj.initialize("./models/moon_ground.obj")
  obj.clear()
  const skyboxData = await obj.initialize("./models/background.obj")

  // SET TEXTURES

  const textureSpider = await setTexture("./img/despacitospidertx.png")
  const textureHat = await setTexture("./img/cowboy_hat.png")
  const textureGround = await setTexture("./img/moon/1_Base_Color.jpg")
  const textureSky = await setTexture("./img/background.jpg")
  const textureLightbulb = await setTexture("./img/lightbulb.png")

  //SET MATERIAL

  const spiderMaterial = new Material(textureSpider) // default shininess = 100.0
  const skyboxMaterial = new Material(textureSky, 10.0)
  const groundMaterial = new Material(textureGround, 1.0)
  const hatMaterial = new Material(textureHat, 40.0)
  const lightbulbMaterial = new Material(textureLightbulb)

  // INITIALIZE RENDERER
  renderer.init(canvas).then((success) => {
    if (!success) return
    //const objectGroup_1: ObjMesh[] = []

    const spider = new ObjMesh(spiderData, spiderMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })

    const lightbulb = new ObjMesh(lightbulbData, lightbulbMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })
    const ground = new ObjMesh(groundData, groundMaterial, { scaleX: 110.0, scaleY: 110.0, scaleZ: 110.0 })
    const skybox = new ObjMesh(skyboxData, skyboxMaterial, { scaleX: 20.0, scaleY: 20.0, scaleZ: 20.0 })

    const spiderRadius = 5.0 // radius of circle
    const spiderCount = 12 // number of spiders to create

    root.attach(skybox)
    root.attach(ground)

    ground.attach(spider)
    spider.attach(lightbulb)

    spider.translate(0.0, 8.0, 0.0)

    for (let i = 0; i < spiderCount; i++) {
      const smallSpider = new ObjMesh(spiderData, spiderMaterial, {
        scaleX: 0.1,
        scaleY: 0.1,
        scaleZ: 0.1,
        x: Math.cos((Math.PI * i) / spiderCount) * spiderRadius,
        y: 5.5,
        z: Math.sin((Math.PI * i) / spiderCount) * spiderRadius,
      })
      spider.attach(smallSpider)
    }
    //objectGroup_1.push(spider)
    //objectGroup_1.push(cowboyhat)

    const doFrame = () => {
      // ANIMATE
      const now = Date.now() / 1000
      cameraControls.update()

      for (let i = 0; i < spider.children.length; i++) {
        let child = spider.children[i]
        let radius = 20 * Math.cos(now) // set the radius of the orbit
        //let radius = 20 * (i + 1) // set the radius of the orbit
        let speed = i + Math.sin(now) // set the speed of the orbit
        //child.x = radius * Math.sin(speed * Math.sin(now)) // calculate the x position of the child
        //child.z = radius * Math.sin(speed * Math.cos(now)) // calculate the z position of the child
        child.x = radius * Math.sin(speed + now)
        child.z = radius * Math.cos(speed + now)
      }

      spider.rotate(0, Math.sin(now) / 10, 0)
      spider.translate(0, Math.sin(now) / 10, 0)
      //cowboyhat.translate(0, Math.sin(now) / 50, 0)
      //spider.translate(Math.sin(now), 0, Math.sin(now))

      // MOVE LIGHT AND LIGHT BULB
      scene.pointLightPosition[0] = Math.cos(now) * 10
      scene.pointLightPosition[1] = 8
      scene.pointLightPosition[2] = Math.sin(now) * 10
      lightbulb.x = scene.pointLightPosition[0]
      lightbulb.y = scene.pointLightPosition[1] - 0.5
      lightbulb.z = scene.pointLightPosition[2]

      //for (let c of objectGroup_1) {
      //  c.rotate(0, Math.cos(now) / 100, 0)
      //}

      // RENDER
      renderer.frame(camera, scene, root)
      requestAnimationFrame(doFrame)
    }
    requestAnimationFrame(doFrame)
  })
}
mainFunc()
