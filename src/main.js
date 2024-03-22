import { Visualization } from './Visualization/Visualization.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';



let viz;
let container;

function main() {
  // Get a reference to the container element
  container = document.querySelector('#scene-container');

  // create a new world
  viz = new Visualization(container);

  // start the animation loop
  viz.start();
  
}
main();
