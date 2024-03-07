import { Visualization } from './Visualization/Visualization.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';



let viz;
let container;

function main() {
  // Get a reference to the container element
  container = document.querySelector('#scene-container');
  // create a new world
  viz = new Visualization(container);


  // const params = {
  //   x: 0,
  //   y: 0,
  //   z: 0,
  //   areaPickSize: 501, //should be an odd number!!
  //   Start: function () {
  //     viz.startExperiment();
  //   },
  //   Stop: function () {
  //     viz.stopExperiment();
  //   },
  //   Show_Results: function () {
  //     viz.showExperimentResults();
  //   },
  //   Reset: function () {
  //     viz.resetExperimentData();
  //   },
  //   LiveUpdate: false,
  //   // function () {
  //   //   viz.toggleLiveUpdate(); 
  //   // }
  //   AllowDeemphasis: true, 
  //   AllowEmphasis: true, 
  //   underAttended: function () {
  //     viz.highLightUnderAttendedObjects(); 
  //   }, 
  //   overAttended: function () {
  //     viz.deemphasizeOverAttendedObjects(); 
  //   }, 
  //   resetColors: function () {
  //     viz.resetColorsOnAllPoints();
  //   }
  // };


  // const gui = new GUI();
  // const folder = gui.addFolder('Dataset properties');
  // folder.add(params, 'x');
  // folder.add(params, 'y');
  // folder.add(params, 'z');
  // folder.close();
  // const areaPick = gui.add(params, 'areaPickSize', 11, 501, 10);
  // areaPick.name("Size of gaze area (px Ø)")
  // areaPick.onFinishChange(function (v) {
  //   console.log('The picking size is now ' + v);
  //   viz.params.areaPickSize = v; 
  //   viz.calculatePickingArea(); 
  // });

  // const expSettings = gui.addFolder('Experiment Settings');
  // expSettings.add(params, 'Start').name("Start data collection");
  // expSettings.add(params, 'Stop').name("Stop data collection");
  // expSettings.add(params, 'Show_Results').name("Show cumulative attention");
  // expSettings.add(params, 'Reset').name("Reset/discard collected data");
  // expSettings.add(params, "LiveUpdate").name("Show realtime cumulative attention").onChange( value => {
  //   viz.toggleLiveUpdate(value);
  // } );
  // expSettings.add(params, "AllowDeemphasis").name("Allow deemphasis of points").onChange( value => {
  //   viz.toggleDeemphasis(value);
  // } );
  // expSettings.add(params, "AllowEmphasis").name("Allow emphasis of points").onChange( value => {
  //   viz.toggleEmphasis(value);
  // } );
  // expSettings.add(params, 'resetColors').name("Reset colours of the visualization"); 
  // // expSettings.add(params, 'underAttended').name("Highlight under-attended points"); 
  // // expSettings.add(params, 'overAttended').name("Darken over-attended points"); 
  // gui.open();

  // start the animation loop
  viz.start();
  // params.areaPickSize = 101; 
  // viz.params.areaPickSize = params.areaPickSize; 
  // viz.calculatePickingArea(); 
  // areaPick.updateDisplay(); 
}
main();
