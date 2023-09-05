import { Application } from "./app"

async function mainFunc() {
  // Check for an existing canvas and remove it if present
  const existingCanvas = document.querySelector("canvas")
  if (existingCanvas) {
    existingCanvas.remove()
  }

  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  // Get the .time-container div
  const timeContainer = document.querySelector(".time-container")

  // If the timeContainer exists, insert the canvas before it. Otherwise, append the canvas to the body.
  if (timeContainer) {
    document.body.insertBefore(canvas, timeContainer)
  } else {
    document.body.appendChild(canvas)
  }

  const app = new Application(canvas)
  await app.start()
}

mainFunc()
