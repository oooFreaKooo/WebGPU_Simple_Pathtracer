import { ObjMesh } from "../engine/obj-mesh"
import { ObjLoader } from "../engine/obj-loader"
import { Light } from "./lighting"
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
  const camera = new Camera([10, 3, 10], 20, 20)
  const cameraControls = new Controls(canvas, camera)

  // ASSETS
  const renderer = new Renderer()
  const obj = new ObjLoader()
  const root = new Node3d()

  // INITIALIZE OBJECTS

  const spiderData = await obj.initialize("./models/Spider.obj")
  obj.clear()
  const lightbulbData = await obj.initialize("./models/lightbulb.obj")
  obj.clear()
  const groundData = await obj.initialize("./models/building.obj")
  obj.clear()
  const skyboxData = await obj.initialize("./models/background.obj")

  // SET TEXTURES

  const textureSpider = await setTexture("./img/despacitospidertx.png")
  const textureGround = await setTexture("./img/building.jpg")
  const textureSky = await setTexture("./img/milkyway.jpg")
  const textureLightbulb = await setTexture("./img/lightbulb.png")

  //SET MATERIAL

  const spiderMaterial = new Material(textureSpider, {
    diffuse: 0.7,
    specular: 0.5,
    ambient: 0.7,
    shininess: 100.0,
  })
  const skyboxMaterial = new Material(textureSky)
  const groundMaterial = new Material(textureGround)
  const lightbulbMaterial = new Material(textureLightbulb)
  const maxnumlights = 100
  const numLights = 30
  const lights = new Light(numLights, [0.1, 0.1, 0.1])

  lights.setAmbientColor([0.1, 0.1, 0.1])

  for (let i = 0; i < numLights; i++) {
    lights.setDiffuseColor(i, [Math.random() * 1.0, Math.random() * 1.0, Math.random() * 1.0])
  }
  // INITIALIZE RENDERER
  renderer.init(canvas, maxnumlights).then((success) => {
    if (!success) return

    const spider = new ObjMesh(spiderData, spiderMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })

    let lightbulb1 = new ObjMesh(lightbulbData, lightbulbMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })
    let lightbulb2 = new ObjMesh(lightbulbData, lightbulbMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })
    let lightbulb3 = new ObjMesh(lightbulbData, lightbulbMaterial, { scaleX: 0.3, scaleY: 0.3, scaleZ: 0.3 })
    const ground = new ObjMesh(groundData, groundMaterial, { scaleX: 10.0, scaleY: 10.0, scaleZ: 10.0 })
    const skybox = new ObjMesh(skyboxData, skyboxMaterial, { scaleX: 200.0, scaleY: 200.0, scaleZ: 200.0 })

    root.attach(ground)
    root.attach(lightbulb1)
    root.attach(lightbulb2)
    root.attach(lightbulb3)
    ground.attach(skybox)
    ground.attach(spider)

    const spiderRadius = 5.0 // radius of circle
    const spiderCount = 12 // number of spiders to create

    for (let i = 0; i < spiderCount; i++) {
      let smallSpider = new ObjMesh(spiderData, spiderMaterial, {
        scaleX: 0.1,
        scaleY: 0.1,
        scaleZ: 0.1,
        x: Math.cos(Math.PI / spiderCount) * spiderRadius,
        y: 1.0,
        z: Math.sin(Math.PI / spiderCount) * spiderRadius,
      })
      spider.attach(smallSpider)
    }
    spider.translate(0, 5, 0)

    const doFrame = () => {
      // ANIMATE
      const now = Date.now() / 1000
      const speed = cameraControls.shiftKeyHeld ? 2.0 : 1.0
      const forwards = vec3.create()
      vec3.cross(forwards, camera.right, camera.up)
      vec3.normalize(forwards, forwards)
      cameraControls.move_player(cameraControls.forwards_amount * speed, cameraControls.right_amount * speed, cameraControls.up_amount, forwards)
      camera.update()

      for (let i = 0; i < spider.children.length; i++) {
        let child = spider.children[i]
        let radius = 20 * Math.cos(now) // set the radius of the orbit
        let speed = i + Math.sin(now) // set the speed of the orbit
        child.x = radius * Math.sin(speed + now)
        child.y = spider.y
        child.z = radius * Math.cos(speed + now)
      }

      spider.translate(0, Math.cos(now) / 20, 0)
      spider.rotate(0, Math.cos(now) / 20, 0)

      // MOVE LIGHT AND LIGHT BULB

      const LIGHT_SPEED = 0.05 // adjust this value to change the speed of the light movement
      const LIGHT_RANGE = 5 // adjust this value to change the range of the light movement

      for (let i = 0; i < numLights; i++) {
        const timeOffset = i * 0.1 // adjust this value to change the amount of offset between lights
        const x = Math.cos(now + timeOffset) * LIGHT_RANGE + i + Math.random() * 0.2 - 0.1 // add a random offset to the x position
        const y = 1
        const z = -Math.sin(now + timeOffset) * LIGHT_RANGE + i + Math.random() * 0.2 - 0.1 // add a random offset to the z position

        lights.setPointLightPosition(i, [x, y, z])
      }

      /*       lightbulb1.x = lights.getPointLightPosition(0)[0]
      lightbulb1.y = lights.getPointLightPosition(0)[1]
      lightbulb1.z = lights.getPointLightPosition(0)[2]

      lightbulb2.x = lights.getPointLightPosition(1)[0]
      lightbulb2.y = lights.getPointLightPosition(1)[1]
      lightbulb2.z = lights.getPointLightPosition(1)[2]

      lightbulb3.x = lights.getPointLightPosition(2)[0]
      lightbulb3.y = lights.getPointLightPosition(2)[1]
      lightbulb3.z = lights.getPointLightPosition(2)[2] */

      const cameracoords = camera.getCameraEye()
      skybox.x = cameracoords[0]
      skybox.y = cameracoords[1]
      skybox.z = cameracoords[2]
      skybox.rotate(0, 0.0005, 0.0005)
      // RENDER
      renderer.frame(camera, lights, root)
      requestAnimationFrame(doFrame)
    }
    requestAnimationFrame(doFrame)
  })
}
mainFunc()

/*     let mouseDown = false
    let lastMouseX: number
    let lastMouseY: number

    canvas.addEventListener("mousedown", (event) => {
      mouseDown = true
      lastMouseX = event.clientX
      lastMouseY = event.clientY
    })

    canvas.addEventListener("mouseup", () => {
      mouseDown = false
    })

    canvas.addEventListener("mousemove", (event) => {
      if (!mouseDown) {
        return
      }

      const deltaX = event.clientX - lastMouseX
      const deltaY = event.clientY - lastMouseY

      spider.translate(deltaX / 10, -deltaY / 10, 0)

      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }) */
