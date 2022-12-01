import math, { Matrix } from 'mathjs';
import { node } from 'webpack';

export class Node3d {

    private parent: Node3d | null = null;

    private scale = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
    private rotation = math.matrix([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    // private translate = math.matrix([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 1]]);
    private transform: Matrix;
    private temp: Node3d[];

    /**
     * read only access to children, use atttach / detatch to modify
     */
    public children: Node3d[] = [];
    constructor(private position: Matrix = math.matrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]),
        scale: Matrix, rotation: Matrix/*translate: Matrix*/) {

        this.scale = scale;
        this.rotation = rotation;
        //  this.translate = translate;
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
            // TODO set transform to difference between transform and parent world transform
        } else {
            for (const node of newChild) {
                this.attach(node);
            }
        }


        // TODO:
        // check if already attached
        // detatch
        // attach at new tree node
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

                // TODO: this.transform = this.worldTransform
            }
        } else {
            for (const nodeNC of newChild) {
                this.detatch(nodeNC);
            }
        }
    }
    // public equals(node: Node3d) {
    //     if (node.position != this.position || node.scale != this.scale || node.translate != this.translate || node.rotation != this.rotation) {
    //         return false;
    //     }
    //     return true;

    // }
    public calcTransformMat() {
        this.transform = math.multiply(this.scale, this.position);
        this.transform = math.multiply(this.rotation, this.transform);
        // this.transform = math.multiply(this.translate, this.transform);
    }
    // TODO:
    // position
    // rotation
    // scale
    // transform matrix
}