import { WebGLRenderer } from 'https://unpkg.com/three@0.160.0/build/three.module.js'; // three

function createRenderer() {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.physicallyCorrectLights = true;

  return renderer;
}

export { createRenderer };
