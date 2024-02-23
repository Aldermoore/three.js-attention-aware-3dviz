import { Group } from 'https://unpkg.com/three@0.160.0/build/three.module.js'; //three

function createMeshGroup() {
    // a group holds other objects
    // but cannot be seen itself
    const group = new Group();

    return group;
}

export { createMeshGroup };
