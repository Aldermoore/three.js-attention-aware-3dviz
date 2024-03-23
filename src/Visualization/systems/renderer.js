import { WebGLRenderer, PCFSoftShadowMap } from 'three';

function createRenderer() {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.physicallyCorrectLights = true;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

  return renderer;
}

export { createRenderer };
