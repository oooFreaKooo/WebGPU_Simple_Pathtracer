import { mat3, mat4, vec3 } from "gl-matrix"
import { node } from "webpack";

export class Node3d {

    private parent: Node3d | null = null;

    private transform: mat4 = mat4.create();
    private worldTransformMatrix: mat4;
    private needTransformUpdate: boolean = true;

    /**
     * read only access to children, use atttach / detatch to modify
     */
    public children: Node3d[] = [];
    constructor(private position = mat4.create(),
        private scale = mat4.create(),
        private rotation = mat4.create()) {
        this.calcTransformMat();
    }

    public attach(newChild: Node3d | Node3d[]) {
        if (newChild instanceof Node3d) {
            if (newChild.parent == this)
                return;

            if (newChild.parent) {
                newChild.parent.detatch(newChild);
            }

            newChild.parent = this;
            this.children.push(newChild);
            //mat4.subtract(newChild.transform, newChild.transform, this.worldTransformMatrix); 
            // TODO set transform to difference between transform and parent world transform
        } else {
            for (const node of newChild) {
                this.attach(node);
            }
        }
    }

    public detatch(newChild: Node3d | Node3d[]) {
        if (newChild instanceof Node3d) {
            if (newChild.parent != null) {
                const idx = this.children.findIndex(_ => _ == newChild);
                if (idx < 0) {
                    throw "You tried to detach an unattached node! This is not how it is supposed to work!";
                }
                this.children.splice(idx, 1);
                newChild.parent = null;

                this.transform = this.calcWorldTransMatrix();
            }
        } else {
            for (const nodeNC of newChild) {
                this.detatch(nodeNC);
            }
        }
    }

    public calcTransformMat() {
        mat4.multiply(this.transform, this.position, this.rotation);
        mat4.multiply(this.transform, this.transform, this.scale);
        this.needTransformUpdate = false;
        this.calcWorldTransMatrix();
        for (const child of this.children) {
            child.needTransformUpdate = true;
        }



    }
    public calcWorldTransMatrix() {
        if (this.parent) {
            return mat4.multiply(this.worldTransformMatrix, this.parent.worldTransformMatrix, this.transform);
        }
        return this.worldTransformMatrix = this.transform;
    }
    // TODO:
    // position
    // rotation
    // scale
    // transform matrix
    public getUpdateFlag() {
        return this.needTransformUpdate;
    }
    public setUpdateFlag(needUpdate: boolean) {
        this.needTransformUpdate = needUpdate;
    }
    public translate(translateVec: vec3) {
        mat4.fromTranslation(this.position, translateVec);
        this.setUpdateFlag(true);
        for (let child of this.children) {
            child.setUpdateFlag(true);
        }
    }
    public rotate(deg: number, axis: vec3) {
        mat4.fromRotation(this.rotation, deg, axis);
        this.setUpdateFlag(true);
        for (let child of this.children) {
            child.setUpdateFlag(true);
        }
    }
    public scaleIt(scaleVec: vec3) {
        mat4.fromScaling(this.scale, scaleVec);
        this.setUpdateFlag(true);
        for (let child of this.children) {
            child.setUpdateFlag(true);
        }
    }
}