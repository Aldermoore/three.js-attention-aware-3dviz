import { DirectionalLight, AmbientLight } from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function createLights() {
  const ambientLight = new AmbientLight(0x222222, 50);

  const mainLight = new DirectionalLight('white', 5);
  mainLight.position.set(10, 10, 10);

  return { ambientLight, mainLight };
}

export { createLights };
