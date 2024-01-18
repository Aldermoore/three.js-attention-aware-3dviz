import { Group } from 'three';

function createMeshGroup() {
    // a group holds other objects
    // but cannot be seen itself
    const group = new Group();

    return group;
}

export { createMeshGroup };
