import { PerspectiveCamera } from 'three';

function createCamera(window) {
  const camera = new PerspectiveCamera(
    35, // fov = Field Of View
    window.innerWidth / window.innerHeight, // aspect ratio (dummy value) TODO: fix this. 
    0.1, // near clipping plane
    100, // far clipping plane
  );

  // move the camera back so we can view the scene
  camera.position.set(0,1.6,3);

  return camera;
}

export { createCamera };
