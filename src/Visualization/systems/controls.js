import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js"// 'three/examples/jsm/controls/OrbitControls.js';


function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);

  controls.enableDamping = false;

  controls.tick = () => controls.update();

  return controls;
}

export { createControls };
