import { Visualization } from './Visualization/Visualization.js';

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


document.getElementById('settingsToggle').addEventListener('click', showSettings); // add an event listener to the button
document.getElementById('startExperiment').addEventListener('click', startExperiment); // add an event listener to the button
document.getElementById('stopExperiment').addEventListener('click', stopExperiment); // add an event listener to the button
document.getElementById('showExperimentResults').addEventListener('click', showExperimentResults); // add an event listener to the button
document.getElementById('reset').addEventListener('click', resetColors); // add an event listener to the button




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


function startExperiment() {
  if (viz != null) {
    viz.startExperiment(); 
    console.log("Started Experiment"); 
  }
}

function stopExperiment() {
  if (viz != null) {
    viz.stopExperiment(); 
    console.log("Stopped Experiment"); 
  }
}

function showExperimentResults() {
  if (viz != null) {
    viz.showExperimentResults(); 
    console.log("Showing Experiment Results"); 
  }
}

function resetColors() {
  if (viz != null) {
    viz.resetColorsOnAllPoints(); 
    console.log("Colors are reset"); 
  }
}