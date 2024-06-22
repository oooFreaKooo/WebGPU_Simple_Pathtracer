import { Application } from "./raytracer-own/core/app"

async function mainFunc() {
  const canvas = document.createElement("canvas")
  //canvas.width = window.innerWidth
  //canvas.height = window.innerHeight
  canvas.width = 1920
  canvas.height = 1080
  // Get the .time-container from the html file
  const timeContainer = document.querySelector(".time-container")

  // If the timeContainer exists, insert the canvas before it. Otherwise, append the canvas to the body.
  if (timeContainer) {
    document.body.insertBefore(canvas, timeContainer)
  } else {
    document.body.appendChild(canvas)
  }

  // start the application
  const app = new Application(canvas)
  await app.start()
}

mainFunc()
