export class Node3d {

    private parent: Node3d | null = null;

    /**
     * read only access to children, use atttach / detatch to modify
     */
    public children: Node3d[] = [];

    public attach(newChild: Node3d | Node3d[]) {
        // TODO:
        // check if already attached
            // detatch
        // attach at new tree node
    }

    public detatch(newChild: Node3d | Node3d[]) {

    }

    // TODO:
    // position
    // rotation
    // scale
    // transform matrix
}