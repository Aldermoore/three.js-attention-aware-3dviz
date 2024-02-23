import { Color, Scene } from 'https://unpkg.com/three@0.160.0/build/three.module.js'; // three


function createScene() {
  const scene = new Scene();

  scene.background = new Color('black');

  return scene;
}

export { createScene };
