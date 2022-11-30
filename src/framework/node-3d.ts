import math, { Matrix } from 'mathjs';
import { node } from 'webpack';

export class Node3d {

    private parent: Node3d | null = null;
    private position = math.zeros(4, 4);
    private scale = math.matrix([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    private rotation = math.matrix([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    private translate = math.matrix([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    private transform: Matrix;
    private temp: Node3d[];

    /**
     * read only access to children, use atttach / detatch to modify
     */
    public children: Node3d[] = [];
    public Node3d(pos: Matrix, scale: Matrix, rotation: Matrix, translate: Matrix) {
        this.position = pos;
        this.scale = scale;
        this.rotation = rotation;
        this.translate = translate;
        this.calcTransformMat();
    }
    public attach(newChild: Node3d | Node3d[]) {
        if (newChild instanceof Node3d) {
            if (newChild.parent != null) {
                if (!this.children.includes(newChild) && newChild.parent != this) {
                    this.detatch(newChild);
                }
            } else {
                newChild.parent = this;
                this.children.push(newChild);
            }
        } else {
            for (const node of newChild) {
                if (node.parent != null) {
                    if (!this.children.includes(node) && node.parent != this) {
                        this.detatch(node);
                    }
                } else {
                    node.parent = this;
                    this.children.push(node);
                }
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
                for (const node of newChild.parent.children) {
                    if (node != newChild) {
                        this.temp.push(node);
                        newChild.parent.children.shift();
                    } else {
                        newChild.parent.children.shift();
                    }
                }
                newChild.parent.children = this.temp;
            }
        } else {
            for (const nodeNC of newChild) {
                if (nodeNC.parent != null) {
                    for (const node of nodeNC.parent.children) {
                        if (node != nodeNC) {
                            this.temp.push(node);
                            nodeNC.parent.children.shift();
                        } else {
                            nodeNC.parent.children.shift();
                        }
                    }
                    nodeNC.parent.children = this.temp;
                }
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
        this.transform = math.multiply(this.rotation, this.position);
        this.transform = math.multiply(this.scale, this.transform);
        this.transform = math.multiply(this.translate, this.transform);
    }
    // TODO:
    // position
    // rotation
    // scale
    // transform matrix
}