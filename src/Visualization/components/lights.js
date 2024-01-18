import { DirectionalLight, AmbientLight } from 'three';

function createLights() {
  const ambientLight = new AmbientLight(0x222222, 10);

  const mainLight = new DirectionalLight('white', 5);
  mainLight.position.set(10, 10, 10);

  return { ambientLight, mainLight };
}

export { createLights };
