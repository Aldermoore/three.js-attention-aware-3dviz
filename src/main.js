import { Visualization } from './Visualization/Visualization.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';


let viz;
let container;

function main() {
  // Get a reference to the container element
  container = document.querySelector('#scene-container');
  // create a new world
  viz = new Visualization(container);


  const params = {
    x: 0,
    y: 0,
    z: 0,
    areaPickSize: 101, //should be an odd number!!
    Start: function () {
      viz.startExperiment();
    },
    Stop: function () {
      viz.stopExperiment();
    },
    Show_Results: function () {
      viz.showExperimentResults();
    },
    Reset: function () {
      viz.resetColorsOnAllPoints();
    },
    LiveUpdate: function () {
      viz.toggleLiveUpdate(); 
    }
  };


  const gui = new GUI();
  /*
  const folder = gui.addFolder('Dataset properties');
  folder.add(params, 'x');
  folder.add(params, 'y');
  folder.add(params, 'z');
  folder.close();
  */
  const areaPick = gui.add(params, 'areaPickSize', 11, 301, 1);
  areaPick.onChange(function (v) {
    console.log('The picking size is now ' + v);
    viz.params.areaPickSize = v; 
    viz.calculatePickingArea(); 
  });

  const expSettings = gui.addFolder('Experiment Settings');
  expSettings.add(params, 'Start');
  expSettings.add(params, 'Stop');
  expSettings.add(params, 'Show_Results');
  expSettings.add(params, 'Reset');
  expSettings.add(params, "LiveUpdate"); 
  gui.open();

  // start the animation loop
  viz.start();
}
main();
