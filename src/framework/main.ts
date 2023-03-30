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
  const camera = new Camera([40, 3, 0], 0, 0)
  const cameraControls = new Controls(canvas, camera)

  // ASSETS
  const renderer = new Renderer()
  const obj = new ObjLoader()
  const root = new Node3d()

  // INITIALIZE OBJECTS

  const garageData = await obj.initialize("./models/warehouse.obj")
  obj.clear()
  const carData = await obj.initialize("./models/car.obj")
  obj.clear()
  const bulbData = await obj.initialize("./models/bulb.obj")
  obj.clear()
  // SET TEXTURES

  const textureGround = await setTexture("./img/snow2.jpg")
  const textureRock = await setTexture("./img/snow1.jpg")
  const textureSky = await setTexture("./img/milkyway.jpg")
  const textureBulb = await setTexture("./img/bulb.png")

  const texturesGarage = [
    await setTexture("./img/garage/Tavan_Base_Color.jpg"),
    await setTexture("./img/garage/Zemin_Base_Color.jpg"),
    await setTexture("./img/garage/Duvarlar_Base_Color.jpg"),
    await setTexture("./img/garage/Demirler_Base_Color.jpg"),
    await setTexture("./img/garage/Odunlar_Base_Color.jpg"),
    await setTexture("./img/garage/ipler_Base_Color.jpg"),
  ]

  const texturesCar = [
    await setTexture("./img/car/paint.png"),
    await setTexture("./img/car/lens.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/textures_color.png"),
    await setTexture("./img/car/carbon.png"),
    await setTexture("./img/car/headlight.png"),
    await setTexture("./img/car/brake_lamp.png"),
    await setTexture("./img/car/reverse_lamp.png"),
    await setTexture("./img/car/turnsignal.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/ssr_color.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/ssr_color.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/ssr_color.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/brakes.png"),
    await setTexture("./img/car/ssr_color.png"),
    await setTexture("./img/car/tire.png"),
    await setTexture("./img/car/brakes.png"),
  ]
  console.log(texturesGarage.length)
  console.log(garageData.length)
  //SET MATERIAL

  const skyboxMaterial = new Material(textureSky)
  const groundMaterial = new Material(textureGround)
  const rockMaterial = new Material(textureRock)
  const bulbMaterial = new Material(textureBulb)

  const maxnumlights = 100
  const numLights = 14
  const lights = new Light(numLights, [0.1, 0.1, 0.1])

  lights.setAmbientColor([0.1, 0.1, 0.1])

  for (let i = 0; i < numLights - 6; i++) {
    lights.setDiffuseColor(i, [7, 7, 4])
  }

  lights.setDiffuseColor(8, [0, 0, 3])
  lights.setDiffuseColor(9, [3, 0, 0])
  lights.setDiffuseColor(10, [0, 3, 0])
  lights.setDiffuseColor(11, [0, 3, 3])
  lights.setDiffuseColor(12, [3, 0, 3])
  lights.setDiffuseColor(13, [3, 3, 0])
  // Set up event listener for light index selection
  const lightIndexSelect = document.querySelector<HTMLSelectElement>("#light-index")!
  lightIndexSelect.addEventListener("change", () => {
    const selectedIndex = lightIndexSelect.selectedIndex
    const currentPosition = lights.getPointLightPosition(selectedIndex)
    document.querySelector<HTMLInputElement>("#light-position-x")!.value = currentPosition[0].toString()
    document.querySelector<HTMLInputElement>("#light-position-y")!.value = currentPosition[1].toString()
    document.querySelector<HTMLInputElement>("#light-position-z")!.value = currentPosition[2].toString()
  })
  // Set up event listener for light position changes
  const lightPositionXInput = document.querySelector<HTMLInputElement>("#light-position-x")!
  const lightPositionYInput = document.querySelector<HTMLInputElement>("#light-position-y")!
  const lightPositionZInput = document.querySelector<HTMLInputElement>("#light-position-z")!
  function setLightPosition() {
    const selectedIndex = lightIndexSelect.selectedIndex
    const x = Number(lightPositionXInput.value)
    const y = Number(lightPositionYInput.value)
    const z = Number(lightPositionZInput.value)
    lights.setPointLightPosition(selectedIndex, [x, y, z])
  }
  lightPositionXInput.addEventListener("input", setLightPosition)
  lightPositionYInput.addEventListener("input", setLightPosition)
  lightPositionZInput.addEventListener("input", setLightPosition)

  // INITIALIZE RENDERER
  renderer.init(canvas, maxnumlights).then((success) => {
    if (!success) return
    const carParts: ObjMesh[] = []
    for (let i = 0; i < carData.length; i++) {
      const texture = texturesCar[i]
      const car = new ObjMesh(carData[i], new Material(texture), { x: -5, y: -1, z: -5, scaleX: 10.0, scaleY: 10.0, scaleZ: 10.0 })
      car.rotate(0, 45, 0)
      root.attach(car)
      carParts.push(car)
    }

    for (let i = 0; i < garageData.length; i++) {
      const texture = texturesGarage[i]
      const garage = new ObjMesh(garageData[i], new Material(texture), { x: 45, z: 100, scaleX: 0.1, scaleY: 0.1, scaleZ: 0.1 })
      root.attach(garage)
    }

    const bulb1 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb2 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb3 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb4 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb5 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb6 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb7 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    const bulb8 = new ObjMesh(bulbData[0], bulbMaterial, { scaleX: 0.01, scaleY: 0.01, scaleZ: 0.01 })
    root.attach(bulb1)
    root.attach(bulb2)
    root.attach(bulb3)
    root.attach(bulb4)
    root.attach(bulb5)
    root.attach(bulb6)
    root.attach(bulb7)
    root.attach(bulb8)
    lights.setPointLightPosition(0, [-2.2, 25.3, 3.7])
    lights.setPointLightPosition(1, [-2.2, 25.3, -14.0])
    lights.setPointLightPosition(2, [-2.2, 25.3, 22])
    lights.setPointLightPosition(3, [-2.2, 25.3, -32])
    lights.setPointLightPosition(4, [-2.1, 22.8, 41.2])
    lights.setPointLightPosition(5, [-2.2, 23.0, 66.6])
    lights.setPointLightPosition(6, [-2.0, 23.89, 87.5])
    lights.setPointLightPosition(7, [-2.2, 24.0, 109])

    /* for (let i = 0; i < skyboxData.length; i++) {
      const skybox = new ObjMesh(skyboxData[i], skyboxMaterial, { scaleX: 200.0, scaleY: 200.0, scaleZ: 200.0 })
      root.attach(skybox)
    } */

    //root.attach(ground)
    const doFrame = () => {
      // ANIMATE
      const now = Date.now() / 1000
      const speed = cameraControls.shiftKeyHeld ? 2.0 : 1.0
      const forwards = vec3.create()
      vec3.cross(forwards, camera.right, camera.up)
      vec3.normalize(forwards, forwards)
      cameraControls.move_player(cameraControls.forwards_amount * speed, cameraControls.right_amount * speed, cameraControls.up_amount, forwards)
      camera.update()

      // Move each car part along the x-axis

      // MOVE LIGHT AND LIGHT BULB

      const radius = 20 // radius of the circle
      const center = [-5, 0, -5] // center of the circle

      for (let i = 8; i < numLights - 3; i++) {
        const timeOffset = i * 2 // time offset for animation
        const angle = now + timeOffset // angle of rotation for animation

        const x = center[0] + radius * Math.cos(angle) // x coordinate of light position
        const y = center[1] // y coordinate of light position
        const z = center[2] + radius * Math.sin(angle) // z coordinate of light position

        // set the position of the light
        lights.setPointLightPosition(i, [x, y, z])
      }

      for (let i = 11; i < numLights; i++) {
        const timeOffset = i * 2 // time offset for animation
        const angle = now + timeOffset // angle of rotation for animation

        const x = center[0] + radius * Math.cos(angle) // x coordinate of light position
        const y = center[1] // y coordinate of light position
        const z = center[2] + radius * Math.sin(angle) // z coordinate of light position

        // set the position of the light
        lights.setPointLightPosition(i, [z, y, x])
      }

      bulb1.x = lights.getPointLightPosition(0)[0]
      bulb1.y = lights.getPointLightPosition(0)[1]
      bulb1.z = lights.getPointLightPosition(0)[2]

      bulb2.x = lights.getPointLightPosition(1)[0]
      bulb2.y = lights.getPointLightPosition(1)[1]
      bulb2.z = lights.getPointLightPosition(1)[2]

      bulb3.x = lights.getPointLightPosition(2)[0]
      bulb3.y = lights.getPointLightPosition(2)[1]
      bulb3.z = lights.getPointLightPosition(2)[2]

      bulb4.x = lights.getPointLightPosition(3)[0]
      bulb4.y = lights.getPointLightPosition(3)[1]
      bulb4.z = lights.getPointLightPosition(3)[2]

      bulb5.x = lights.getPointLightPosition(4)[0]
      bulb5.y = lights.getPointLightPosition(4)[1]
      bulb5.z = lights.getPointLightPosition(4)[2]

      bulb6.x = lights.getPointLightPosition(5)[0]
      bulb6.y = lights.getPointLightPosition(5)[1]
      bulb6.z = lights.getPointLightPosition(5)[2]

      bulb7.x = lights.getPointLightPosition(6)[0]
      bulb7.y = lights.getPointLightPosition(6)[1]
      bulb7.z = lights.getPointLightPosition(6)[2]

      bulb8.x = lights.getPointLightPosition(7)[0]
      bulb8.y = lights.getPointLightPosition(7)[1]
      bulb8.z = lights.getPointLightPosition(7)[2]
      /* const cameracoords = camera.getCameraEye()
      root.x = cameracoords[0]
      root.y = cameracoords[1]
      root.z = cameracoords[2]
      root.rotate(0, 0.0005, 0.0005) */
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
