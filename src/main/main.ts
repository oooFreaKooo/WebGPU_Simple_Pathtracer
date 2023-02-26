import { App } from "./app"

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("gfx-main")

const app = new App(canvas)
app.InitializeRenderer().then(() => {
  app.run()
})
