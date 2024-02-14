import { OrthographicCamera } from 'three';

function createOrthograpichCamera(width, height) {
  const camera = new OrthographicCamera(
    width / - 2, 
    width / 2, 
    height / 2, 
    height / - 2, 
    0.1, // near clipping plane
    1000, // far clipping plane
  );

  // move the camera back so we can view the scene
  camera.position.set(50,50,50);

  return camera;
}

export { createOrthograpichCamera };
