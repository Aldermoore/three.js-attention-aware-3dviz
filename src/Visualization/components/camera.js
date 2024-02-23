import { PerspectiveCamera } from "https://unpkg.com/three@0.160.0/build/three.module.js"; //three


function createCamera() {
  const camera = new PerspectiveCamera(
    35, // fov = Field Of View
    1, // aspect ratio (dummy value) TODO: fix this. 
    0.1, // near clipping plane
    1000, // far clipping plane
  );

  // move the camera back so we can view the scene
  camera.position.set(10,70,70);

  return camera;
}

export { createCamera };
