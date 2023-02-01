import { mat4 } from "gl-matrix";
const createCamera = require("3d-view-controls");

export class Camera {
  //Properties
  private camera: any;
  private projection: mat4 = mat4.create();
  public keyLabel: HTMLElement;
  public mouseXLabel: HTMLElement;
  public mouseYLabel: HTMLElement;

  //Construktor
  constructor(canvas: HTMLCanvasElement, private respectRatio = 1.0, private fieldOfView = 100) {
    const cameraOption = {
      eye: [2, 2, 20],
      center: [0, 0, 0],
      zoomMax: 100,
      zoomSpeed: 2,
    };

    this.camera = createCamera(canvas, cameraOption);
    this.computeProjection();
  }
  //Methods
  public tick() {
    if (this.camera.tick()) {
      this.computeProjection();
    }
  }
  public getView() {
    return this.camera.matrix;
  }

  public getproj() {
    return this.projection;
  }

  public setFieldOfView(fov: number) {
    // set variable
    this.fieldOfView = fov;

    // call computeProjection
    this.computeProjection();
  }

  private computeProjection() {
    this.projection = mat4.perspective(
      mat4.create(),
      (2 * Math.PI) / 5,
      this.respectRatio,
      0.1,
      this.fieldOfView
    );
  }
}
