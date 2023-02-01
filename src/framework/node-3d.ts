import { mat4, vec3 } from "gl-matrix"

export class Node3d {
  private parent: Node3d | null = null

  private transform = mat4.create()
  private worldTransformMatrix = mat4.create();
  private needTransformUpdate: boolean = true

  /**
   * read only access to children, use atttach / detatch to modify
   */
  public children: Node3d[] = []
  constructor(public position = mat4.create(), private scale = mat4.create(), private rotation = mat4.create()) {
    this.calcTransformMat()
  }

  public attach(newChild: Node3d | Node3d[]) {
    if (newChild instanceof Node3d) {
      if (newChild.parent == this) return

      if (newChild.parent) {
        newChild.parent.detatch(newChild)
      }

      this.setUpdateFlag(true);
      newChild.setUpdateFlag(true);
      newChild.parent = this;
      this.children.push(newChild);
    } else {
      for (const node of newChild) {
        this.attach(node)
      }
    }
  }

  public detatch(newChild: Node3d | Node3d[]) {
    if (newChild instanceof Node3d) {
      if (newChild.parent != null) {
        const idx = this.children.findIndex((_) => _ == newChild)
        if (idx < 0) {
          throw "You tried to detach an unattached node! This is not how it is supposed to work!"
        }
        this.children.splice(idx, 1)
        newChild.parent = null

        this.transform = this.calcWorldTransMatrix()
      }
    } else {
      for (const nodeNC of newChild) {
        this.detatch(nodeNC)
      }
    }
  }

  public clearChildren() {
    this.children = []
  }

  public calcTransformMat() {
    mat4.multiply(this.transform, this.position, this.rotation)
    mat4.multiply(this.transform, this.transform, this.scale)
    this.needTransformUpdate = false
    this.calcWorldTransMatrix()
    for (const child of this.children) {
      child.needTransformUpdate = true
    }






  }
  public calcWorldTransMatrix() {
    if (this.parent) {
      return mat4.multiply(this.worldTransformMatrix, this.transform, this.parent.worldTransformMatrix);
    }

    return mat4.copy(this.worldTransformMatrix, this.transform);
  }


  // TODO:

  public rotate(axis: vec3, angle: number) {
    mat4.rotate(this.rotation, mat4.create(), angle, axis)
    this.calcTransformMat()
  }
  // position
  // rotation
  // scale
  // transform matrix

  public getUpdateFlag() {
    return this.needTransformUpdate
  }
  public setUpdateFlag(needUpdate: boolean) {
    this.needTransformUpdate = needUpdate
  }
  public getTransform() {
    return this.transform;
  }
  public getWorldTransform() {
    return this.worldTransformMatrix;
  }

}
