import { PerspectiveCamera, Vector3 } from 'three';

function createCamera(window) {
  const camera = new PerspectiveCamera(
    35,                                     // fov = Field Of View
    window.innerWidth / window.innerHeight, // aspect ratio
    0.1,                                    // near clipping plane
    100,                                    // far clipping plane
  );

  // move the camera back so we can view the scene
  camera.position.x = 2; 
  camera.position.y = 1.6; 
  camera.position.z = 2; 

  return camera;
}

export { createCamera };
