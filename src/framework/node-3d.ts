import math, { Matrix } from 'mathjs';
import { node } from 'webpack';

export class Node3d {

    private parent: Node3d | null = null;

    private transform: Matrix;
    private worldTransformMatrix: Matrix;

    /**
     * read only access to children, use atttach / detatch to modify
     */
    public children: Node3d[] = [];
    constructor(private position: Matrix = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]),
        private scale = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]),
        private rotation = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])) {
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
            newChild.transform = math.subtract(newChild.transform, this.worldTransformMatrix);// TODO set transform to difference between transform and parent world transform
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
                    throw "Try to detach node that is not attached to this.";
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
        this.transform = math.multiply(this.scale, this.position);
        this.transform = math.multiply(this.rotation, this.transform);
    }
    public calcWorldTransMatrix() {
        if (this.parent) {
            return this.worldTransformMatrix = math.multiply(this.parent.worldTransformMatrix, this.transform);
        }
        return this.transform;
    }
    // TODO:
    // position
    // rotation
    // scale
    // transform matrix
}