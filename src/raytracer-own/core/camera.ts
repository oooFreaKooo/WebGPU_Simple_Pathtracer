import { vec3 } from 'gl-matrix'
import { Deg2Rad } from '../utils/helper'

export class Camera {
    cameraIsMoving: boolean = false
    forwards: vec3
    fov: number = 135
    phi: number = 0
    position: vec3
    right: vec3
    theta: number= 0
    up: vec3

    constructor (initialPosition: vec3) {
        this.position = vec3.clone(initialPosition)
        this.theta = 0.0
        this.phi = 0.0
        this.recalculate_vectors()
    }

    hasChanged (newPosition: vec3, newTheta: number, newPhi: number): boolean {
        return (
            !vec3.equals(this.position, newPosition) ||
      this.theta !== newTheta ||
      this.phi !== newPhi
        )
    }

    recalculate_vectors (): void {
    // Calculate forward vector
        this.forwards = vec3.fromValues(
            Math.cos(Deg2Rad(this.phi)) * Math.sin(Deg2Rad(this.theta)),
            Math.sin(Deg2Rad(this.phi)),
            Math.cos(Deg2Rad(this.phi)) * Math.cos(Deg2Rad(this.theta))
        )

        // Calculate right vector
        this.right = vec3.create()
        vec3.cross(this.right, this.forwards, vec3.fromValues(0.0, 1.0, 0.0))
        vec3.normalize(this.right, this.right)

        // Calculate up vector
        this.up = vec3.create()
        vec3.cross(this.up, this.right, this.forwards)
        vec3.normalize(this.up, this.up)

        // Indicate that the camera has moved
        this.cameraIsMoving = true
    }
}

