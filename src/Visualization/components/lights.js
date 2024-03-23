import { DirectionalLight, AmbientLight, SpotLight, HemisphereLight } from 'three';

function createLights() {

  const ambientLight = new AmbientLight(0x222222, 30);

  const hemisphereLight = new HemisphereLight( 0xffffbb, 0x080820, 50 );


  const mainLight = new DirectionalLight('white', 5);
  mainLight.position.set(-10, 20, 10);
  mainLight.castShadow = true;

  //Set up shadow properties for the light
  mainLight.shadow.mapSize.width = 512; // default
  mainLight.shadow.mapSize.height = 512; // default
  mainLight.shadow.camera.near = 0.5; // default
  mainLight.shadow.camera.far = 500; // default



  return { ambientLight, mainLight };
}

export { createLights };
