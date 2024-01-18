import { Visualization } from './Visualization/Visualization.js';

function main() {
  // Get a reference to the container element
  const container = document.querySelector('#scene-container');

  // create a new world
  const viz = new Visualization(container);

  // start the animation loop
  viz.start();
}

main();
