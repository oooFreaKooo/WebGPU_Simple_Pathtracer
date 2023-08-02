import { Application1 } from "./app1"
import { Application2 } from "./app2"

let currentApp: Application1 | Application2 | undefined

async function mainFunc(selectedApp: string) {
  // Check for an existing canvas and remove it if present
  const existingCanvas = document.querySelector("canvas")
  if (existingCanvas) {
    existingCanvas.remove()
  }

  const canvas = document.createElement("canvas")
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  if (currentApp && currentApp.stop) {
    currentApp.stop()
  }

  // Get the .time-container div
  const timeContainer = document.querySelector(".time-container")

  // If the timeContainer exists, insert the canvas before it. Otherwise, append the canvas to the body.
  if (timeContainer) {
    document.body.insertBefore(canvas, timeContainer)
  } else {
    document.body.appendChild(canvas)
  }

  if (selectedApp === "app1") {
    const app1 = new Application1(canvas)
    await app1.start()
    currentApp = app1
  } else if (selectedApp === "app2") {
    const app2 = new Application2(canvas)
    await app2.start()
    currentApp = app2
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const appChoiceContainer = document.getElementById("appChoiceContainer")

  if (appChoiceContainer) {
    appChoiceContainer.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement
      if (target && target.name === "appChoice") {
        mainFunc(target.value)
      }
    })

    // Call mainFunc with the default value "app1" to load it by default
    mainFunc("app2")
  }
})
