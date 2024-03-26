import { Visualization } from './Visualization/Visualization.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';



let viz;
let container;

function main() {

  let params = {
    data: 'Scatterplot',
    areaPickSize: 361, //should be an odd number!!
    Start: function () { viz.startExperiment() },
    Stop: function () { viz.stopExperiment() },
    Show_Results: function () { viz.showExperimentResults() },
    Reset: function () { viz.resetExperimentData() },
    liveUpdate: false,
    allowDeemphasis: true,
    allowEmphasis: true,
    resetColors: function () { viz.resetColorsOnAllPoints() },
    deemphasizeThreshold: 90,
    emphasizeThreshold: 5,
    attentionIntervalMS: 100,
    recolorIntervalMS: 100,
    decayRate: 1000,
    heightModifier: 0.5,
    allowController: false, 
    experimentStarted: true
  };

  // Get a reference to the container element
  container = document.querySelector('#scene-container');

  // create a new world
  viz = new Visualization(container, params);

  // start the animation loop
  viz.start();
  
}
main();
