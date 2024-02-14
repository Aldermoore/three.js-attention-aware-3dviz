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


document.getElementById('settingsToggle').addEventListener('click', showSettings); // add an event listener to the button

function showSettings() {
  let setCon = document.getElementById('settingsContainer'); 
  let button = document.getElementById('settingsToggle');
  if (setCon.style.visibility == "hidden") {
    setCon.style.visibility = "visible";
    button.innerText = "Hide settings"; 
  } else {
    setCon.style.visibility = "hidden";
    button.innerText = "Show settings"; 
  }
}