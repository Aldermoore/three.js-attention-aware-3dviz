import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createOrthograpichCamera } from './components/cameraOrthographic.js';
import { makeTextSprite } from './components/textSprite.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';
import { createControls } from './systems/controls.js'

// Datasets
import iris from './data/iris.json' assert {type: 'json'};
import elevation from './data/mt_bruno_elevation.json' assert {type: 'json'};
import cars from './data/cars.json' assert {type: 'json'};

// import { ViewHelper } from './components/viewHelper.js';

// THREEjs libraries 
import TWEEN from '@tweenjs/tween.js'

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';



let vizContainer;
let camera;
let renderer;
let scene;
let loop;
// let viewHelper;
let stats;

let xAxis, yAxis, zAxis;
let xLabel, yLabel, zLabel;
let xValueUpper, xValueLower, yValueUpper, yValueLower, zValueUpper, zValueLower;

let dataPoints;
let pickingPoints;
let pickingScene;
let matrix;
let quaternion;
let color;
var pickingMaterial, pickingTextureHover, pickingTextureAreaHover, pickingTextureOcclusion;

var mousePick = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

var width = window.innerWidth;
var height = window.innerHeight;


var screenBuffer;
let facesMaxAttention = 0;
let facesAttentionStore = [];
let objectMaxAttention = 0;
let objectAttentionStore = [];

let tempObjectAttentionStore = [];
let triggeredStore = [];
const deemphasizeThreshold = 90;
const emphasizeThreshold = 5;

const attentionIntervalMS = 100;
const recolorIntervalMS = 100;
var attentionID;
var reColorID;
var decayID;
const decayRate = 1000;




const colorScale = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'];
// Blue, red, green, yellow, cyan, purple, grey. See https://personal.sron.nl/~pault/#sec:qualitative 
var attentionList;


// let experimentStarted = false;
// let liveUpdate = false;
let experimentPaused = false;

let gui;




let params = {
  data: 'Terrainmap',
  areaPickSize: 101, //should be an odd number!!
  Start: function () { viz.startExperiment() },
  Stop: function () { viz.stopExperiment() },
  Show_Results: function () { viz.showExperimentResults() },
  Reset: function () { viz.resetExperimentData() },
  liveUpdate: false,
  allowDeemphasis: false,
  allowEmphasis: false,
  resetColors: function () { viz.resetColorsOnAllPoints() },
  deemphasizeThreshold: 90,
  emphasizeThreshold: 5,
  attentionIntervalMS: 100,
  recolorIntervalMS: 100,
  decayRate: 1000,
  heightModifier: 0.5,
  allowController: true,
  experimentStarted: true
};

var viz;


class Visualization {

  centerRow;
  centerColumn;
  radius;
  radiusSquared;


  constructor(container, parameters) {

    params = parameters;
    vizContainer = container;
    viz = this;



    this.centerRow = Math.floor((params.areaPickSize) / 2);
    this.centerColumn = Math.floor((params.areaPickSize) / 2);
    this.radius = params.areaPickSize / 2;
    this.radiusSquared = this.radius * this.radius;

    camera = createCamera(window);
    // camera = createOrthograpichCamera(width, height);
    renderer = createRenderer();
    scene = createScene();
    loop = new Loop(camera, scene, renderer);
    container.append(renderer.domElement);
    window.addEventListener('mousemove', this.onMouseMove, false);

    this.calculatePickingArea();


    dataPoints = new THREE.Group();
    pickingPoints = new THREE.Group();
    matrix = new THREE.Matrix4();
    quaternion = new THREE.Quaternion();
    color = new THREE.Color();

    pickingScene = new THREE.Scene();
    pickingTextureHover = new THREE.WebGLRenderTarget(1, 1);
    pickingTextureAreaHover = new THREE.WebGLRenderTarget(params.areaPickSize, params.areaPickSize);
    pickingTextureOcclusion = new THREE.WebGLRenderTarget(width, height);
    pickingMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true
    });



    const controls = createControls(camera, renderer.domElement);
    const { ambientLight, mainLight } = createLights();
    // viewHelper = new ViewHelper(camera, container, controls);


    scene.add(ambientLight, mainLight);


    const resizer = new Resizer(container, camera, renderer);
    resizer.onResize = () => {
      this.render(); // Technically not needed if we just constantly rerender each frame. 
    }

  }

  /**
   * initialise the visualisation environment
   */
  init() {
    scene.add(dataPoints);
    pickingScene.add(pickingPoints);



    if (params.data === 'Scatterplot') {
      // Initialising the scatterplot
      this.createScatterplotVisualization();
    } else if (params.data === 'Terrainmap') {
      // Initialising the terrainmap
      this.createTerrainMapVisualization();
    } else if (params.data === 'Barchart') {
      // Initialising the barchart
      this.createBarChartVisualization();
    }
  }



  handleNewVisualization() {
    // remove old data from scene and picking scene
    dataPoints.children = [];
    pickingPoints.children = [];
    scene.remove(xAxis, yAxis, zAxis, xLabel, yLabel, zLabel, xValueLower, xValueUpper, yValueLower, yValueUpper, zValueLower, zValueUpper);

    // Reconstruct the new visualisation
    if (params.data === 'Scatterplot') {
      // Initialising the scatterplot
      this.createScatterplotVisualization();
    } else if (params.data === 'Terrainmap') {
      // Initialising the terrainmap
      this.createTerrainMapVisualization();
    } else if (params.data === 'Barchart') {
      // Initialising the barchart
      this.createBarChartVisualization();
    }
  }



  createBarChartVisualization() {

    let models = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82];
    let cylinders = [3, 4, 5, 6, 8];


    let finalData = new Array(models.length);
    for (let i = 0; i < finalData.length; i++) {
      finalData[i] = new Array(cylinders.length);
      finalData[i].fill(0);

    }

    for (let i = 0; i < cars.length; i++) {
      let model, cylinder = 0;
      let car = cars[i];
      for (let j = 0; j < finalData.length; j++) {
        if (car.Model == models[j]) {
          model = j;
        }
      }
      for (let k = 0; k < cylinders.length; k++) {
        if (car.Cylinders == cylinders[k] && car.Origin != "Asia") {
          cylinder = k;
        }
      }

      finalData[model][cylinder] += 1;
    }

    console.log(finalData);


    let id = 1;
    for (let row = 0; row < finalData.length; row++) {
      for (let col = 0; col < finalData[0].length; col++) {
        let height = finalData[row][col];
        height = this.map_range(height, 0, 28, 0, 1);
        let heightSegments = Math.ceil(height * 4);

        let markColor = new THREE.Color(colorScale[col]);
        let position = new THREE.Vector3(col / 7, 0 - params.heightModifier, row / 7)
        let geometry = new THREE.BoxGeometry(0.1, height, 0.1, 2, heightSegments, 2);
        let material = new THREE.MeshPhongMaterial({ color: "silver", wireframe: false, flatShading: true, userData: { oldColor: markColor }, vertexColors: true });
        material.userData.originalColor = markColor;


        let box = new THREE.Mesh(geometry, material);



        facesAttentionStore[id] = new Array(geometry.attributes.position.count * 2); // TODO: find the optimal size for this array! 
        facesAttentionStore[id].fill(0);
        objectAttentionStore[id] = 0;
        tempObjectAttentionStore[id] = 50;


        box.name = id;
        id++;
        box.position.set(position.x, (height / 2) - params.heightModifier, position.z);

        let pickingBox = this.createBoxBuffer(geometry, box);
        let pickingMesh = new THREE.Mesh(pickingBox, pickingMaterial);
        pickingMesh.name = id;

        box.geometry = box.geometry.toNonIndexed();
        this.applyVertexColors(box.geometry, new THREE.Color(markColor)); // markColor

        dataPoints.add(box);
        pickingPoints.add(pickingMesh);
      }

    }


    // Draw axes for the visualisation
    const geometryX = new THREE.BufferGeometry();
    geometryX.setFromPoints([new THREE.Vector3(-0.1, 0 - params.heightModifier, -0.1), new THREE.Vector3(0.68, 0 - params.heightModifier, -0.1)]);
    xAxis = new THREE.Line(geometryX, new THREE.LineBasicMaterial());
    scene.add(xAxis);

    const geometryY = new THREE.BufferGeometry();
    geometryY.setFromPoints([new THREE.Vector3(-0.1, 0 - params.heightModifier, -0.1), new THREE.Vector3(-0.1, 1 - params.heightModifier, -0.1)]);
    yAxis = new THREE.Line(geometryY, new THREE.LineBasicMaterial());
    scene.add(yAxis);

    const geometryZ = new THREE.BufferGeometry();
    geometryZ.setFromPoints([new THREE.Vector3(-0.1, 0 - params.heightModifier, -0.1), new THREE.Vector3(-0.1, 0 - params.heightModifier, 1.8)]);
    zAxis = new THREE.Line(geometryZ, new THREE.LineBasicMaterial());
    scene.add(zAxis);


    // Draw labels on the axes 
    xLabel = makeTextSprite("Cylinders", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xLabel.center = new THREE.Vector2(0.2, 0.5);
    xLabel.position.set(0.35, 0 - params.heightModifier, -0.2);
    scene.add(xLabel);

    xValueUpper = makeTextSprite("3", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueUpper.center = new THREE.Vector2(0, 0.5);
    xValueUpper.position.set(0, -0.1 - params.heightModifier, -0.15);
    scene.add(xValueUpper);

    xValueLower = makeTextSprite("8", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueLower.center = new THREE.Vector2(0, 0.5);
    xValueLower.position.set(0.6, -0.1 - params.heightModifier, -0.15);
    scene.add(xValueLower);


    zLabel = makeTextSprite("Model Year", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zLabel.center = new THREE.Vector2(0.2, 0.5);
    zLabel.position.set(-0.2, 0 - params.heightModifier, 1);
    scene.add(zLabel);

    zValueLower = makeTextSprite("1970", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueLower.center = new THREE.Vector2(0.1, 0.5);
    zValueLower.position.set(-0.2, -0.1 - params.heightModifier, -0);
    scene.add(zValueLower);

    zValueUpper = makeTextSprite("1982", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueUpper.center = new THREE.Vector2(0.1, 0.5);
    zValueUpper.position.set(-0.2, -0.1 - params.heightModifier, 1.75);
    scene.add(zValueUpper);


    yLabel = makeTextSprite("No. cars", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yLabel.center = new THREE.Vector2(0.2, 0.5);
    yLabel.position.set(-0.2, 0.5 - params.heightModifier, -0.2);
    scene.add(yLabel);

    yValueLower = makeTextSprite("0", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueLower.center = new THREE.Vector2(0, 0.5);
    yValueLower.position.set(-0.2, -0.1 - params.heightModifier, -0.2);
    scene.add(yValueLower);

    yValueUpper = makeTextSprite("28", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueUpper.center = new THREE.Vector2(0, 0.5);
    yValueUpper.position.set(-0.2, 0.9 - params.heightModifier, -0.2);
    scene.add(yValueUpper);
  }

  /**
   * 
   * @param {THREE.BoxGeometry} geometry The geometry who's attributes to copy
   * @param {THREE.Mesh} mesh The mesh who's position and ID to copy
   * @returns THREE.BoxGeometry constructed from the input geometry and mesh
   */
  createBoxBuffer(geometry, mesh) {
    var buffer = new THREE.BoxGeometry(geometry.parameters.width, geometry.parameters.height, geometry.parameters.depth, geometry.parameters.widthSegments, geometry.parameters.heightSegments, geometry.parameters.depthSegments).toNonIndexed();; // SphereBufferGeometry
    quaternion.setFromEuler(mesh.rotation);
    matrix.compose(mesh.position, quaternion, mesh.scale);
    buffer.applyMatrix4(matrix);
    buffer.name = mesh.name;
    this.applyUniqueVertexColors(buffer, buffer.name); // , color.setHex(mesh.name));

    return buffer;
  }




  createScatterplotVisualization() {

    // TODO nice way for the user to choose this, rather than being hardcoded 
    var xAttr = Object.keys(iris[0])[0] // iris.sepalLength; 
    var yAttr = Object.keys(iris[0])[1] // iris.sepalWidth;
    var zAttr = Object.keys(iris[0])[3] // iris.petalWidth; 
    var colorAttr = Object.keys(iris[0])[4] //iris.species; 
    var shapeAttr = null;


    // Count unique istances of entries for categorical data (in this case, species)
    var tempResult = {}
    for (let { species } of iris) {
      tempResult[species] = {
        species,
        count: tempResult[species] ? tempResult[species].count + 1 : 1
      };
    }
    let speciesList = Object.values(tempResult);
    console.log(speciesList);

    let xAttrMax = Math.max.apply(null, iris.map(function (o) { return o.sepalLength }));
    let xAttrMin = Math.min.apply(null, iris.map(function (o) { return o.sepalLength }));

    console.log(xAttrMin, xAttrMax)

    let yAttrMax = Math.max.apply(null, iris.map(function (o) { return o.sepalWidth }));
    let yAttrMin = Math.min.apply(null, iris.map(function (o) { return o.sepalWidth }));

    console.log(yAttrMin, yAttrMax)

    let zAttrMax = Math.max.apply(null, iris.map(function (o) { return o.petalWidth }));
    let zAttrMin = Math.min.apply(null, iris.map(function (o) { return o.petalWidth }));

    console.log(zAttrMin, zAttrMax)

    for (let index = 0; index < iris.length; index++) {

      const element = iris[index];
      element.id = index + 1;
      element.attention = 0;

      // Determine color based on species attribute 
      // Colours in default order: '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'.
      let color;
      if (element.species == speciesList[0].species) {
        color = colorScale[0];
      } else if (element.species == speciesList[1].species) {
        color = colorScale[1];
      } else if (element.species == speciesList[2].species) {
        color = colorScale[2];
      } else { color = colorScale[3] }

      // Map the data to a specific plot area 
      let xVal = this.map_range(element.sepalLength, xAttrMin, xAttrMax, 0, 2);
      let yVal = this.map_range(element.sepalWidth, yAttrMin, yAttrMax, 0, 1.5) - params.heightModifier;
      let zVal = this.map_range(element.petalWidth, zAttrMin, zAttrMax, 0, 2);

      // TODO: Nice way to bind data-dimensions to scene dimensions (X,Y,Z), and to mark-attributes (size, height/width/thickness, colour, orientation) depending on the type of mark. 
      // TODO: Normalise input data to a desired, configurable size of the visualization. 
      this.createSphere(index + 1, color, new THREE.Vector3(xVal, yVal, zVal), 0.03);

    } // for


    // Draw axes for the visualisation
    const geometryX = new THREE.BufferGeometry();
    geometryX.setFromPoints([new THREE.Vector3(0, 0 - params.heightModifier, 2), new THREE.Vector3(2, 0 - params.heightModifier, 2)]);
    xAxis = new THREE.Line(geometryX, new THREE.LineBasicMaterial());
    scene.add(xAxis);

    const geometryY = new THREE.BufferGeometry();
    geometryY.setFromPoints([new THREE.Vector3(0, 0 - params.heightModifier, 2), new THREE.Vector3(0, 1.5 - params.heightModifier, 2)]);
    yAxis = new THREE.Line(geometryY, new THREE.LineBasicMaterial());
    scene.add(yAxis);

    const geometryZ = new THREE.BufferGeometry();
    geometryZ.setFromPoints([new THREE.Vector3(0, 0 - params.heightModifier, 0), new THREE.Vector3(0, 0 - params.heightModifier, 2)]);
    zAxis = new THREE.Line(geometryZ, new THREE.LineBasicMaterial());
    scene.add(zAxis);

    // Draw labels on the axes 
    xLabel = makeTextSprite("Sepal Length", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xLabel.center = new THREE.Vector2(0.2, 0.5);
    xLabel.position.set(1, -0.1 - params.heightModifier, 2.1);
    scene.add(xLabel);

    xValueUpper = makeTextSprite("4.3", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueUpper.center = new THREE.Vector2(0, 0.5);
    xValueUpper.position.set(0, -0.1 - params.heightModifier, 2.1);
    scene.add(xValueUpper);

    xValueLower = makeTextSprite("7.9", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueLower.center = new THREE.Vector2(0, 0.5);
    xValueLower.position.set(2, -0.1 - params.heightModifier, 2.1);
    scene.add(xValueLower);


    zLabel = makeTextSprite("Petal Width", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zLabel.center = new THREE.Vector2(0.2, 0.5);
    zLabel.position.set(-0.1, -0.1 - params.heightModifier, 1);
    scene.add(zLabel);

    zValueLower = makeTextSprite("0.1", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueLower.center = new THREE.Vector2(0, 0.5);
    zValueLower.position.set(-0.2, -0.1 - params.heightModifier, -0);
    scene.add(zValueLower);

    zValueUpper = makeTextSprite("2.5", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueUpper.center = new THREE.Vector2(0, 0.5);
    zValueUpper.position.set(-0.2, -0.1 - params.heightModifier, 2);
    scene.add(zValueUpper);


    yLabel = makeTextSprite("Sepal Width", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yLabel.center = new THREE.Vector2(0.2, 0.5);
    yLabel.position.set(-0.1, 0.5 - params.heightModifier, 2.1);
    scene.add(yLabel);

    yValueLower = makeTextSprite("2", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueLower.center = new THREE.Vector2(0, 0.5);
    yValueLower.position.set(-0.1, 0.01 - params.heightModifier, 2.1);
    scene.add(yValueLower);

    yValueUpper = makeTextSprite("4.4", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueUpper.center = new THREE.Vector2(0, 0.5);
    yValueUpper.position.set(-0.1, 1.4 - params.heightModifier, 2.1);
    scene.add(yValueUpper);

  }



  createTerrainMapVisualization() {
    this.createTerrainMap(1, colorScale[3], new THREE.Vector3(1, 0 - params.heightModifier, 1), 1);

    // Draw axes for the visualisation
    const geometryX = new THREE.BufferGeometry();
    geometryX.setFromPoints([new THREE.Vector3(0.45, 0 - params.heightModifier, 0.45), new THREE.Vector3(1.55, 0 - params.heightModifier, 0.45)]);
    xAxis = new THREE.Line(geometryX, new THREE.LineBasicMaterial());
    scene.add(xAxis);

    const geometryY = new THREE.BufferGeometry();
    geometryY.setFromPoints([new THREE.Vector3(0.45, 0 - params.heightModifier, 0.45), new THREE.Vector3(0.45, 0.35 - params.heightModifier, 0.45)]);
    yAxis = new THREE.Line(geometryY, new THREE.LineBasicMaterial());
    scene.add(yAxis);

    const geometryZ = new THREE.BufferGeometry();
    geometryZ.setFromPoints([new THREE.Vector3(0.45, 0 - params.heightModifier, 0.45), new THREE.Vector3(0.45, 0 - params.heightModifier, 1.55)]);
    zAxis = new THREE.Line(geometryZ, new THREE.LineBasicMaterial());
    scene.add(zAxis);



    // Draw labels on the axes 
    xLabel = makeTextSprite("Lattitude", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xLabel.center = new THREE.Vector2(0.2, 0.5);
    xLabel.position.set(1, 0 - params.heightModifier, 0.4);
    scene.add(xLabel);

    xValueUpper = makeTextSprite("0", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueUpper.center = new THREE.Vector2(0, 0.5);
    xValueUpper.position.set(0.5, -0.1 - params.heightModifier, 0.4);
    scene.add(xValueUpper);

    xValueLower = makeTextSprite("100", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    xValueLower.center = new THREE.Vector2(0, 0.5);
    xValueLower.position.set(1.5, -0.1 - params.heightModifier, 0.4);
    scene.add(xValueLower);


    zLabel = makeTextSprite("Longitude", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zLabel.center = new THREE.Vector2(0.2, 0.5);
    zLabel.position.set(0.4, 0 - params.heightModifier, 1);
    scene.add(zLabel);

    zValueLower = makeTextSprite("0", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueLower.center = new THREE.Vector2(0.1, 0.5);
    zValueLower.position.set(0.4, -0.1 - params.heightModifier, 0.5);
    scene.add(zValueLower);

    zValueUpper = makeTextSprite("100", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    zValueUpper.center = new THREE.Vector2(0.1, 0.5);
    zValueUpper.position.set(0.4, -0.1 - params.heightModifier, 1.5);
    scene.add(zValueUpper);


    yLabel = makeTextSprite("Elevation", { fontsize: 32, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yLabel.center = new THREE.Vector2(0.2, 0.5);
    yLabel.position.set(0.4, 0.125 - params.heightModifier, 0.4);
    scene.add(yLabel);

    yValueLower = makeTextSprite("0", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueLower.center = new THREE.Vector2(0, 0.5);
    yValueLower.position.set(0.4, -0.1 - params.heightModifier, 0.4);
    scene.add(yValueLower);

    yValueUpper = makeTextSprite("300", { fontsize: 16, textColor: { r: 255, g: 255, b: 255, a: 0 }, borderColor: { r: 255, g: 0, b: 255, a: 1.0 } });
    yValueUpper.center = new THREE.Vector2(0, 0.5);
    yValueUpper.position.set(0.4, 0.25 - params.heightModifier, 0.4);
    scene.add(yValueUpper);
  }



  makeGUI(visualization) {
    gui = new GUI({ container: document.getElementById('gui') });
    gui.add(params, 'data', ['Scatterplot', 'Terrainmap', 'Barchart']).onFinishChange(() => this.handleNewVisualization());
    const areaPick = gui.add(params, 'areaPickSize', 11, 501, 10);
    areaPick.name("Size of gaze area (px Ø)")
    areaPick.onFinishChange(function (v) {
      console.log('The picking size is now ' + v);
      params.areaPickSize = v;
      viz.calculatePickingArea(); // calculatePickingArea(); 
    });

    const expSettings = gui.addFolder('Experiment Settings');
    expSettings.add(params, 'Start').name("Start data collection");
    expSettings.add(params, 'Stop').name("Stop data collection");
    expSettings.add(params, 'Show_Results').name("Show cumulative attention");
    expSettings.add(params, 'Reset').name("Reset/discard collected data");
    expSettings.add(params, "liveUpdate").name("Show realtime cumulative attention").onFinishChange(value => {
      this.toggleLiveUpdate(value);
    });
    expSettings.add(params, "allowDeemphasis").name("Allow deemphasis of points").onChange(value => {
      visualization.toggleDeemphasis(value);
    });
    expSettings.add(params, "allowEmphasis").name("Allow emphasis of points").onChange(value => {
      visualization.toggleEmphasis(value);
    });
    expSettings.add(params, 'resetColors').name("Reset colours of the visualization");



    const attentionSettings = gui.addFolder('Attention Model Settings');
    attentionSettings.add(params, 'deemphasizeThreshold', 60, 100, 5).name("Deemphasis threshold");
    attentionSettings.add(params, 'emphasizeThreshold', 0, 40, 5).name("Emphasis threshold");
    attentionSettings.add(params, 'attentionIntervalMS', 10, 1000, 100).name("Attention update (MS)");
    attentionSettings.add(params, 'recolorIntervalMS', 10, 1000, 100).name("Recolouring update (MS)");
    attentionSettings.add(params, 'decayRate', 100, 5000, 500).name("Attention decay (MS)");

    attentionSettings.close();

    gui.open();
    gui.domElement.style.visibility = 'visible';

    // group = new InteractiveGroup(renderer, camera);
    // // scene.add(group);

    // const mesh = new HTMLMesh(gui.domElement);
    // mesh.position.x = -0.75;
    // mesh.position.y = 0;
    // mesh.position.z = -0.5;
    // mesh.rotation.y = Math.PI / 4;
    // // mesh.scale.setScalar( 2 );
    // group.add(mesh);

    stats = new Stats();
    // vizContainer.appendChild(stats.dom);
    stats.dom.style.width = '80px';
    stats.dom.style.height = '48px';

    // const statsMesh = new HTMLMesh(stats.dom);
    // statsMesh.position.x = - 0.75;
    // statsMesh.position.y = 0.5;
    // statsMesh.position.z = - 0.6;
    // statsMesh.rotation.y = Math.PI / 4;
    // // statsMesh.scale.setScalar( 2.5 );
    // group.add(statsMesh);
  }


  start() {
    this.init();
    this.makeGUI(viz);
    this.render();
    this.animate();
    //this.toggleLiveUpdate();
    this.startExperiment(); // autostart the experiment, TODO should this only get called when the user enters immersive mode?? - To test 
  }


  stop() {
    loop.stop();
  }


  render() {
    // draw a single frame
    renderer.render(scene, camera);
    // stats.update();
  }


  animate() {
    renderer.setAnimationLoop(() => {
      this.render();

      screenBuffer = this.checkForOcclusion();
      this.checkFrustum();


      // We only use attention aware strategies if the experiment is running and we are not currently live-showing the cumulative attention 
      if (params.experimentStarted && !params.liveUpdate && !params.experimentPaused) {
        // console.log(tempObjectAttentionStore);
        for (const element of dataPoints.children) {

          if (params.allowDeemphasis && tempObjectAttentionStore[element.name] > deemphasizeThreshold) { // check if point needs to be deemphasised
            triggeredStore[element.name] = true;
            // deemphasizing 
            element.material.color.lerp(new THREE.Color("#555555"), 0.05);

          } else if (params.allowEmphasis && tempObjectAttentionStore[element.name] < emphasizeThreshold) { // check if point needs to be emphasised 

            triggeredStore[element.name] = true;
            // emphasize
            element.material.color.lerp(new THREE.Color("#FFFFFF"), 0.05);
            this.applyVertexColors(element.geometry, new THREE.Color('orange'));

          } else {

            // check if point is currently emphasised or deemphasised
            if (triggeredStore[element.name]) {

              tempObjectAttentionStore[element.name] = 50; // return to baseline 
              triggeredStore[element.name] = false; // Set the point to be not currently emphasised or deemphasised

            }

            // restore to baseline 
            if (element.material.color != new THREE.Color('silver')) {

              element.material.color.lerp(new THREE.Color('silver'), 0.1);

            }

            this.applyVertexColors(element.geometry, new THREE.Color(element.material.userData.originalColor));
          }
        } // for
      }
    });
  }


  onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    width = window.innerWidth;
    height = window.innerHeight;

    pickingTextureOcclusion = new THREE.WebGLRenderTarget(width, height);

  }


  /******************** 
   * OBJECT CREATION CODE
   * These functions are primarily used for object creation purposes
  */


  /**
   * 
   * @param {number} id ID of the mesh created
   * @param {number} markColor Colour of the mesh created
   * @param {THREE.Vector3} position Vector position of the mesh created
   */
  createSphere(id, markColor, position, size) {
    let geometry = new THREE.SphereGeometry(size, 8, 4);
    let material = new THREE.MeshPhongMaterial({ color: 'silver', flatShading: false, userData: { oldColor: markColor }, vertexColors: true });
    material.userData.originalColor = markColor;
    let sphere = new THREE.Mesh(geometry, material);

    facesAttentionStore[id] = new Array(geometry.attributes.position.count * 2); // TODO: find the optimal size for this array! 
    facesAttentionStore[id].fill(0);
    objectAttentionStore[id] = 0;
    tempObjectAttentionStore[id] = 50;


    sphere.name = id;
    sphere.position.set(position.x, position.y, position.z);


    let pickingSphere = this.createSphereBuffer(geometry, sphere);
    let pickingMesh = new THREE.Mesh(pickingSphere, pickingMaterial);
    pickingMesh.name = id;

    sphere.geometry = sphere.geometry.toNonIndexed();
    // sphere.material.vertexColors = true;
    this.applyVertexColors(sphere.geometry, new THREE.Color(markColor)); // markColor
    // sphere.material.needsUpdate;

    dataPoints.add(sphere);
    pickingPoints.add(pickingMesh);
    return { sphere, pickingMesh };
  }


  /**
   * 
   * @param {THREE.SphereGeometry} geometry The geometry who's attributes to copy
   * @param {THREE.Mesh} mesh The mesh who's position and ID to copy
   * @returns THREE.SphereGeometry constructed from the input geometry and mesh
   */
  createSphereBuffer(geometry, mesh) {
    var buffer = new THREE.SphereGeometry(geometry.parameters.radius, geometry.parameters.widthSegments, geometry.parameters.heightSegments).toNonIndexed();; // SphereBufferGeometry
    quaternion.setFromEuler(mesh.rotation);
    matrix.compose(mesh.position, quaternion, mesh.scale);
    buffer.applyMatrix4(matrix);
    buffer.name = mesh.name;
    this.applyUniqueVertexColors(buffer, buffer.name); // , color.setHex(mesh.name));

    return buffer;
  }



  /**
   * 
   * @param {*} id 
   * @param {*} markColor 
   * @param {*} position 
   * @param {*} size 
   */
  createTerrainMap(id, markColor, position, size) {
    let geometry = new THREE.PlaneGeometry(size, size, 24, 23);
    geometry.rotateX(-Math.PI * 0.5); // rotating the geometry to be vertical
    let material = new THREE.MeshPhongMaterial({ color: markColor, side: THREE.DoubleSide, wireframe: false, flatShading: true, userData: { oldColor: markColor }, vertexColors: true });

    material.userData.originalColor = markColor;
    let plane = new THREE.Mesh(geometry, material);
    facesAttentionStore[id] = new Array(geometry.attributes.position.count * 3); // TODO: find the optimal size for this array! 
    facesAttentionStore[id].fill(0);
    objectAttentionStore[id] = 0;
    tempObjectAttentionStore[id] = 50;


    plane.name = id;
    plane.position.set(position.x, position.y, position.z);

    let row = 0;
    let col = 0;
    for (let i = 1; i < plane.geometry.attributes.position.array.length; i += 3) {
      let val = (elevation[col][row]);
      val = this.map_range(val, 0, 300, 0, 0.25);
      plane.geometry.attributes.position.array[i] = val;
      col++;
      if (col > 24) {
        col = 0;
        row++;
      }
    }

    this.createTerrainMapBuffer(id, position, size);
    // let pickingTerrainMap = this.createTerrainMapBuffer(geometry, plane);
    // let pickingMesh = new THREE.Mesh(pickingTerrainMap, pickingMaterial);
    // pickingMesh.name = id;

    plane.geometry = plane.geometry.toNonIndexed();
    // sphere.material.vertexColors = true;
    this.applyVertexColors(plane.geometry, new THREE.Color(markColor)); // markColor
    // sphere.material.needsUpdate;

    dataPoints.add(plane);
    // pickingPoints.add(pickingMesh);
    // return { plane, pickingMesh };
  }


  /**
   * 
   * @param {THREE.SphereGeometry} geometry The geometry who's attributes to copy
   * @param {THREE.Mesh} mesh The mesh who's position and ID to copy
   * @returns THREE.SphereGeometry constructed from the input geometry and mesh
   */
  createTerrainMapBuffer(id, position, size) {
    let geometry = new THREE.PlaneGeometry(size, size, 24, 23);
    geometry.rotateX(-Math.PI * 0.5); // rotating the geometry to be vertical
    // let material = new THREE.MeshPhongMaterial({side: THREE.DoubleSide, wireframe: false, flatShading: true, vertexColors: true });

    // let plane = new THREE.Mesh(geometry, material);

    geometry.name = id;


    // let pickingTerrainMap = this.createTerrainMapBuffer(geometry, plane);
    let pickingMesh = new THREE.Mesh(geometry, pickingMaterial);
    pickingMesh.name = id;
    pickingMesh.position.set(position.x, position.y, position.z);

    let row = 0;
    let col = 0;
    for (let i = 1; i < geometry.attributes.position.array.length; i += 3) {
      let val = (elevation[col][row]);
      val = this.map_range(val, 0, 300, 0, 0.25);
      geometry.attributes.position.array[i] = val;
      col++;
      if (col > 24) {
        col = 0;
        row++;
      }
    }

    pickingMesh.geometry = pickingMesh.geometry.toNonIndexed();
    this.applyUniqueVertexColors(pickingMesh.geometry, geometry.name); // , color.setHex(mesh.name));
    pickingPoints.add(pickingMesh);
    // return buffer;
  }


  /**
   * Recolors the object in the specified color
   * @param {THREE.BufferGeometry} geometry The geometry in the scene to recolor
   * @param {THREE.Color} color The color to recolor the object in
   */
  applyVertexColors(geometry, color) {
    // Color needs to be converted from Linear to SRGB because reasons 
    // (if not the color will be wrong for all but primary (e.g. R=1,B=0,G=0) and secondary (e.g. R=1,B=1,G=0) colors!)
    color.convertLinearToSRGB();
    var position = geometry.attributes.position;
    var colors = [];
    for (var i = 0; i < position.count; i += 3) {
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.colorsNeedUpdate = true;
  }


  /**
   * Gives each face of every object a unique color, allowing each face to be identified via GPU picking
   * @param {THREE.BufferGeometry} geometry The geometry in the scene to recolor
   * @param {number} geometryID An ID of the geometry, must be between 1 and 255
   */
  applyUniqueVertexColors(geometry, geometryID) {
    const colors = [];
    const color = new THREE.Color();
    const position = geometry.getAttribute('position');

    for (let i = 0; i < position.array.length; i += 3) {
      let hex = (geometryID << 16) + i / 3;
      // console.log("ID:", geometryID, "Vertex:", i / 3, "Hexcode:", hex);
      color.setHex(hex);
      /*
      Color needs to be converted from Linear to SRGB because reasons 
      (if not the color will be wrong for all but primary (e.g. R=1,B=0,G=0) and secondary (e.g. R=1,B=1,G=0) colors!)
      */

      color.convertLinearToSRGB();
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);

    }
    // define the new attribute
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.colorsNeedUpdate = true;
  }




  /********************
   * OCCLUSION, HOVERING AND FRUSTUM CHECKING 
   * These functions are used to determine which objects are within the frustum (camera's FOV), whether objects are visible on the screen or occluded, and which objects are located underneath and around the cursor. 
   */




  /**
   * Renders the entires scene in a seperate pickingScene. Used to determine which objects are visible on the screen via GPU picking 
   * @returns buffer of the entire screen. Each value is the colour of the pixel as a hex-value. 
   */
  checkForOcclusion() {
    var hexBuffer;
    var viewPortWidth = 2100;
    var viewPortHeight = 1800;
    renderer.setRenderTarget(pickingTextureOcclusion);
    renderer.render(pickingScene, camera);
    var pixelBuffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(pickingTextureOcclusion, 0, 0, width, height, pixelBuffer); // width, height 
    renderer.setRenderTarget(null);
    hexBuffer = this.rgbaToHex(pixelBuffer);

    // dataPoints.children.forEach(element => {
    //   if (hexBuffer.includes(element.name)) {
    //     element.isOccluded = false;
    //   } else element.isOccluded = true;
    // });
    return hexBuffer;
  }


  isHoveringAreaBuffer(buffer) {
    let subBuffer;
    subBuffer = this.findAreaFromArray(buffer, width, height, params.areaPickSize, mousePick.x, mousePick.y); // quest 3 res: 1680x1760 // 1000 works well for width!! 

    return subBuffer;
  }


  isHoveringAreaBufferStandalone() {
    camera.setViewOffset(renderer.domElement.width,
      renderer.domElement.height,
      renderer.domElement.width / 2 - (this.params.areaPickSize / 2) | 0,
      0,
      // mousePick.x * window.devicePixelRatio - (this.params.areaPickSize / 2) | 0, 
      // mousePick.y * window.devicePixelRatio - (this.params.areaPickSize / 2) | 0, 
      this.params.areaPickSize,
      this.params.areaPickSize);
    renderer.setRenderTarget(pickingTextureAreaHover);
    renderer.render(pickingScene, camera);
    camera.clearViewOffset();
    var pixelBuffer = new Uint8Array(this.params.areaPickSize * this.params.areaPickSize * 4);
    renderer.readRenderTargetPixels(pickingTextureAreaHover, 0, 0, this.params.areaPickSize, this.params.areaPickSize, pixelBuffer);
    var hexBuffer = this.rgbaToHex(pixelBuffer);
    renderer.setRenderTarget(null);
    return hexBuffer;
  }


  isOccludedBuffer(object) {
    renderer.setRenderTarget(pickingTextureOcclusion);
    renderer.render(pickingScene, camera);
    var pixelBuffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(pickingTextureOcclusion, 0, 0, width, height, pixelBuffer);
    renderer.setRenderTarget(null);
    var hexBuffer = this.rgbaToHex(pixelBuffer);

    return !hexBuffer.includes(object.name);
  }


  isHoveringRaycaster(object) {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects[0] && intersects[0].object === object) {
      return true;
    } else {
      return false;
    }
  }


  isHoveringBuffer() {
    camera.setViewOffset(renderer.domElement.width, renderer.domElement.height, mousePick.x * window.devicePixelRatio | 0, mousePick.y * window.devicePixelRatio | 0, 1, 1);
    renderer.setRenderTarget(pickingTextureHover);
    renderer.render(pickingScene, camera);
    camera.clearViewOffset();
    var pixelBuffer = new Uint8Array(4);
    renderer.readRenderTargetPixels(pickingTextureHover, 0, 0, 1, 1, pixelBuffer);
    var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
    renderer.setRenderTarget(null);
    if (id != null) {
      return id;
    } else return 0;
  }


  hoveringRaycaster() {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    // if (intersects[0]) {
    //   console.log(intersects[0]);
    //   intersects[0].object.geometry.computeVertexNormals();
    //   console.log(intersects[0].object.geometry.getAttribute("normal"));
    // }
    return intersects[0];
  }


  isOccludedRaycaster(object) {
    raycaster.setFromCamera(getScreenPos(object), camera);
    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects[0] && intersects[0].object === object) {
      return false;
    } else {
      return true;
    }
  }


  inFrustum(object) {
    var frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    return frustum.intersectsObject(object);
  }


  checkFrustum() {
    var frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    dataPoints.children.forEach(element => {
      if (frustum.intersectsObject(element)) {
        element.inFrustum = true;
      } else element.inFrustum = false;
    });
  }


  findAreaFromArray(array, arrayWidth, arrayHeight, squareSize, xCor, yCor) {
    yCor = Math.abs(yCor - (arrayHeight)); // reversing the Y-coordinate
    // if (arrayWidth * arrayHeight != array.length) {
    //   alert("Something's up!");
    // }

    if (yCor < 0) yCor = 0;
    if (xCor < 0) xCor = 0;
    let row = 0;
    let column = 0;
    let startRow = Math.ceil((yCor) - squareSize / 2);
    if (startRow < 0) startRow = 0; // startRow = startRow < 0 ? 0 : startRow;
    let endRow = Math.floor((yCor) + squareSize / 2);
    if (endRow > arrayHeight) endRow = arrayHeight;// endRow = endRow > ArrayHeight ? ArrayHeight : endRow;
    let startCol = Math.ceil((xCor) - squareSize / 2);
    if (startCol < 0) startCol = 0; // startCol = startCol < 0 ? 0 : startCol;
    let endCol = Math.floor((xCor) + squareSize / 2);
    if (endCol > arrayWidth) endCol = arrayWidth; // endCol = endCol > arrayWidth ? arrayWidth : endCol;
    let subArray = []

    for (let index = 0; index < array.length; index++) {
      if (row >= startRow && row <= endRow && column >= startCol && column <= endCol) {
        subArray.push(array[index]);
      }
      column++;
      if (column > arrayWidth - 1) {
        column = 0;
        row++;
      }
    }
    return subArray;
  }


  isInsideCirle(row, column, centerRow, centerColumn, radiusSquared) {
    let dx = centerRow - row;
    let dy = centerColumn - column;
    let distance = dx * dx + dy * dy;
    return distance <= radiusSquared
  }


  /**
   * Convert array of RGBA colors to Hex colors. 
   * Input an array of sequencial RBGA colors, e.g. [R,G,B,A,R,G,B,A,...]
   * Outputs a new array of Hex values
   * @param {Uint8Array} rgbaBuffer an array of sequencial RBGA colors, e.g. [R,G,B,A,R,G,B,A,...]. Values range from 0-255. 
   * @returns Array of Hex color values computed from the RGBA array
   */
  rgbaToHex(rgbaBuffer) {
    var hexBuffer = new Array(rgbaBuffer.length / 4);
    var p = 0;
    for (let i = 0; i < rgbaBuffer.length; i += 4) {
      var val = (rgbaBuffer[i] << 16) | (rgbaBuffer[i + 1] << 8) | (rgbaBuffer[i + 2]);
      hexBuffer[p] = val;
      p++;
    }
    return hexBuffer
  }





  /********************
   * HELPER FUNCTIONS 
   */




  onMouseMove(event) {
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;
    mousePick.x = event.clientX;
    mousePick.y = event.clientY;
  }


  getScreenPos(object) {
    var pos = object.position.clone();
    camera.updateMatrixWorld();
    pos.project(camera);
    return new THREE.Vector2(pos.x, pos.y);
  }


  calcDistanceBetweenObjects(objectA, objectB) {
    let distance = Math.sqrt((objectB.position.x - objectA.position.x) ^ 2 + (objectB.position.y - objectA.position.y) ^ 2 + (objectB.position.z - objectA.position.z) ^ 2);
    console.log("The distance is " + distance);
  }


  map_range(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }


  calculatePickingArea() {
    this.centerRow = Math.floor((params.areaPickSize) / 2);
    this.centerColumn = Math.floor((params.areaPickSize) / 2);
    pickingTextureAreaHover = new THREE.WebGLRenderTarget(params.areaPickSize, params.areaPickSize);
    console.log("The Viz' picking area is now ", params.areaPickSize);
  }


  circleFromSquareBuffer(buffer) {
    let tempBuffer = [];
    let row = 0;
    let col = 0;

    for (let i = 0; i < buffer.length; i++) {
      if (this.isInsideCirle(row, col, this.centerRow, this.centerColumn, this.radiusSquared)) {
        tempBuffer.push(buffer[i]);
      }
      col++;
      if (col >= params.areaPickSize) {
        col = 0;
        row++;
      }
    }
    return tempBuffer;
  }


  /********************
 * ATTENTION AWARE FEEDBACK 
 * Functions used to do cool stuff depending on the amount of attention on the points and/or faces of the objects in the scene. 
 */




  increaseAttentionToPoint(buffer) {
    let colorsInBuffer = new Set(buffer);
    if (colorsInBuffer.size === 1) return;
    colorsInBuffer = Array.from(colorsInBuffer);
    for (let i = 0; i < colorsInBuffer.length; i++) {
      colorsInBuffer[i] = (colorsInBuffer[i] >> 16);
    }
    let objectsInBuffer = new Set(colorsInBuffer);
    objectsInBuffer = Array.from(objectsInBuffer);
    for (let i = 0; i < objectsInBuffer.length; i++) {
      if (objectsInBuffer[i] != 0) {
        objectAttentionStore[objectsInBuffer[i]]++;
        if (tempObjectAttentionStore[objectsInBuffer[i]] < 100) {
          tempObjectAttentionStore[objectsInBuffer[i]]++;
        }
      }
    }
  }


  decayTempAttention() {
    for (let i = 1; i <= tempObjectAttentionStore.length; i++) {
      if (tempObjectAttentionStore[i] > 0) {
        tempObjectAttentionStore[i]--;
      }
    }
  }


  showLevelsOfAttentionOnAllPoints() {
    let baseColor = new THREE.Color("#FFFFFF"); // #666666

    for (const element of dataPoints.children) {
      element.material.color = baseColor;
    }
    // let maxAttention = 0;
    for (let index = 0; index < iris.length; index++) {
      // if(iris[index].attention > maxAttention) maxAttention = iris[index].attention; 
      // maxAttention = iris[index].attention > maxAttention ? iris[index].attention : maxAttention;
      console.log("attention", maxAttention);
    }
    console.log(maxAttention)
    return maxAttention;
  }


  updateAttentionColor(objectID, maxAttention) {
    //console.log("recolouring");
    for (const element of dataPoints.children) {
      if (element.name == objectID) {
        let attentionOnPoint = iris[objectID - 1].attention;
        if (attentionOnPoint != 0) {
          let newColor = assignColor('#ffff00', '#ff0000', 0, maxAttention, attentionOnPoint); // colour taken from here: https://github.com/wistia/heatmap-palette
          this.recolorPoint(element, newColor);
        }
      }
    }
  }


  recolorPoint(element, colorHex) {
    let color = new THREE.Color(colorHex);
    element.material.color = color;
  }


  addAttentionToFaces(buffer) {
    let colorsInBuffer = new Set(buffer);
    if (colorsInBuffer.size === 1) return;
    colorsInBuffer = Array.from(colorsInBuffer);

    for (let i = 0; i < colorsInBuffer.length; i++) {
      if (colorsInBuffer[i] != 0) {
        let id = (colorsInBuffer[i] >> 16);
        let vertex = ((colorsInBuffer[i] << 16));
        vertex = vertex >> 16;
        // console.log("ID:", id, "Vertex:", vertex, colorsInBuffer[i]);
        facesAttentionStore[id][vertex]++;
        if (facesAttentionStore[id][vertex] > facesMaxAttention) facesMaxAttention = facesAttentionStore[id][vertex];
      }
    }
  }


  /**
   * Recolors the vertices on a point, based on the amount of attention give to them. If no new level of attention, then the objects does not change colour. 
   * This function is used for live preview of the attention give to points. 
   * @param {THREE.Mesh} element The mesh object in the scene to recolor. 
   */
  recolorVerticesOnPoint(element) {
    let id = element.name;
    let attentionList = facesAttentionStore[id];
    const oldColors = element.geometry.getAttribute("color").array;

    let NewDataColors = [];

    let count = element.geometry.getAttribute("position").count;
    let NewColor = new THREE.Color("red");

    for (let i = 0; i <= count; i += 3) {
      let attentionOnFace = attentionList[i / 3];
      let oldVertexColor = new THREE.Color("silver");
      oldVertexColor.fromArray(oldColors, i * 3);

      if (attentionOnFace > 0) {
        let col = assignColor('#ffff00', '#ff0000', 0, facesMaxAttention, attentionOnFace);
        let newColor = new THREE.Color(col);

        NewDataColors.push(newColor.r, newColor.g, newColor.b);
        NewDataColors.push(newColor.r, newColor.g, newColor.b);
        NewDataColors.push(newColor.r, newColor.g, newColor.b);
      } else {
        NewDataColors.push(oldVertexColor.r, oldVertexColor.g, oldVertexColor.b);
        NewDataColors.push(oldVertexColor.r, oldVertexColor.g, oldVertexColor.b);
        NewDataColors.push(oldVertexColor.r, oldVertexColor.g, oldVertexColor.b);
      }
    }
    element.geometry.setAttribute('color', new THREE.Float32BufferAttribute(NewDataColors, 3));
    element.geometry.colorsNeedUpdate = true;
  }

  /**
   * resets the color of all objects to their original color when they were instantiated, or whichever color is stored in material.userData.originalColor
   */
  resetColorsOnAllPoints() {
    for (const element of dataPoints.children) {
      this.applyVertexColors(element.geometry, new THREE.Color(element.material.userData.originalColor));
      element.material.color = new THREE.Color("silver");
    }
  }

  resetAttentionToAllPoints() {
    objectAttentionStore.fill(0);
    for (let i = 1; i <= facesAttentionStore.length; i++) {
      if (facesAttentionStore[i] != undefined) {
        facesAttentionStore[i].fill(0);
      }
    }
    console.log(objectAttentionStore);
  }



  emphasiseLeastSeenObjects(numberOfObjects) {
    let attentionStore = objectAttentionStore.toSorted();
    let objectsToBeEmphasised = attentionStore.slice(numberOfObjects - 1);

    dataPoints.children.forEach(element => {
      if (objectsToBeEmphasised.includes(element.name)) {
        this.applyVertexColors(element.geometry, new THREE.Color('orange'));
      }

    });

    // let attentionStore = objectAttentionStore;
    // attentionStore.sort();
    // let objectsToBeEmphasised = attentionStore.slice(numberOfObjects - 1);
    // dataPoints.children.array.forEach(element => {
    //   for (let index = 0; index < objectsToBeEmphasised.length; index++) {
    //     if (element.name === objectsToBeEmphasised[index]) {
    //       // object must be recolored
    //       this.applyVertexColors(element.geometry, new THREE.Color('orange'));
    //     }

    //   }
    // });
  }



  deemphasiseMostSeenObjects(numberOfObjects) {
    let attentionStore = objectAttentionStore.toSorted();
    attentionStore.reverse();
    let objectsToBeDeemphasised = attentionStore.slice(numberOfObjects - 1);
    dataPoints.children.forEach(element => {
      if (objectsToBeDeemphasised.includes(element.name)) {
        element.material.color = new THREE.Color("#555555");
      }

    });
  }



  findUnderAttendedObjects() {
    let underAttended = new Array();
    for (let i = 1; i <= tempObjectAttentionStore.length; i++) {
      if (tempObjectAttentionStore[i] > 0 && tempObjectAttentionStore[i] < 20) {
        underAttended.push(i);
      }
    }
    console.log(underAttended);
    return underAttended;
  }


  highLightUnderAttendedObjects() {
    // let objectsToHighLight = this.findUnderAttendedObjects()
    let array = new Array();
    for (let i = 1; i <= tempObjectAttentionStore.length; i++) {
      if (tempObjectAttentionStore[i] = 0) {
        array.push(i);
      }
    }
    for (const element of dataPoints.children) {
      if (array.includes(element.name)) {
        this.applyVertexColors(element.geometry, new THREE.Color('orange'));
        // element.material.color = new THREE.Color("yellow");
      }
    }
  }


  deemphasizeOverAttendedObjects() {
    // let objectsToHighLight = this.findUnderAttendedObjects()
    let array = new Array();
    for (let i = 1; i <= tempObjectAttentionStore.length; i++) {
      if (tempObjectAttentionStore[i] > 90) {
        array.push(i);
      }
    }
    for (const element of dataPoints.children) {
      if (array.includes(element.name)) {
        element.material.color = new THREE.Color("#555555");
      }
    }
  }


  slowlyDeemphasizeOverAttendedObjects() {
    let highlightColor = new THREE.Color("#555555");
    let objectsToHighLight = this.findUnderAttendedObjects()
    for (const element of dataPoints.children) {
      if (!objectsToHighLight.includes(element.name)) {
        element.material.color.lerp(highlightColor, 0.1);
      }
    }
  }



  findAndHighLightMark(objectID) {
    console.log("Gotta highlight", objectID)
    let highlightColor = new THREE.Color("white");

    for (const element of dataPoints.children) {
      if (element.name == objectID) {
        this.scaleUp(element, 1.2);
        element.material.color.lerp(highlightColor, 1);
      } else {
        this.scaleDown(element);
        let oldColor = new THREE.Color(element.material.userData.oldColor)
        element.material.color.lerp(oldColor, 1);
      }
    }
  }


  selectMarksWithSameAttribute(objectID, attribute) {
    if (objectID > 0) {
      let target = iris[objectID - 1]
      let relatedTargets = iris.filter(x => x[attribute] === target[attribute]);
      console.log(relatedTargets);
      for (let index = 0; index < relatedTargets.length; index++) {
        for (const element of dataPoints.children) {
          if (element.name == relatedTargets[index].id) {
            this.highLightMark(element);
          }
        }
      }
    } else {
      for (const element of dataPoints.children) {
        this.unHighLightMark(element);
      }
    }
  }


  highLightMark(element) {
    console.log("Gotta highlight", element.name)
    let highlightColor = new THREE.Color("white");
    this.scaleUp(element, 1.2);
    element.material.color.lerp(highlightColor, 0.1);
  }


  unHighLightMark(element) {
    this.scaleDown(element);
    let oldColor = new THREE.Color(element.material.userData.oldColor)
    element.material.color.lerp(oldColor, 0.1);
  }


  scaleUp(object, scale) {
    new TWEEN.Tween(object.scale).to({
      x: scale,
      y: scale,
      z: scale,
    }, 50).easing(TWEEN.Easing.Quadratic.Out).start();
  }


  scaleDown(object) {
    new TWEEN.Tween(object.scale).to({
      x: 1,
      y: 1,
      z: 1,
    }, 50).easing(TWEEN.Easing.Quadratic.Out).start();
  }



  /********************
   * EXPERIMENT CONTROLS 
   * Functions used to start, stop and reset data collection 
   */


  startExperiment() {
    // this.resetAttentionToAllPoints();
    console.log("Data collection started!");
    params.experimentStarted = true;

    attentionID = setInterval(() => {
      if (!experimentPaused) {
        let subBuffer = this.isHoveringAreaBuffer(screenBuffer);
        // let subBuffer = this.isHoveringAreaBufferStandalone(); 
        let circleBuffer = this.circleFromSquareBuffer(subBuffer);
        this.addAttentionToFaces(circleBuffer);
        this.increaseAttentionToPoint(circleBuffer);
      }
    }, params.attentionIntervalMS);

    decayID = setInterval(() => {
      if (!experimentPaused) {
        this.decayTempAttention();
      }
    }, params.decayRate);
  }


  stopExperiment() {
    console.log("Data collection stopped!");
    params.experimentStarted = false;
    clearInterval(attentionID);
    attentionID = null;
    clearInterval(decayID);
    decayID = null;
  }


  showExperimentResults() {
    // let maxiAttention = this.showLevelsOfAttentionOnAllPoints();
    // for (const element of dataPoints.children) {
    //   this.updateAttentionColor(element.name, maxiAttention);
    // }
    let color = new THREE.Color('white');
    for (const element of dataPoints.children) {
      // this.updateAttentionColor(element.name, maxiAttention);
      this.applyVertexColors(element.geometry, color);
      this.recolorVerticesOnPoint(element);
    }
    console.log("Showing cumulated attention on objects");
  }

  resetExperimentData() {
    this.resetAttentionToAllPoints();
    this.resetColorsOnAllPoints();
    console.log("Collected data reset!");
  }


  toggleLiveUpdate() {
    if (!params.liveUpdate) {
      // liveUpdate = false;
      console.log("Live preview of cumulative attention turned off");
      clearInterval(reColorID);
      reColorID = null;
    } else {
      // liveUpdate = true;
      console.log("Live preview of cumulative attention turned on");
      reColorID = setInterval(() => {
        dataPoints.children.forEach(element => {
          let seen = false;
          let array = facesAttentionStore[element.name];
          for (let i = 0; i < array.length; i++) {
            if (array[i] > 0) {
              seen = true;
              break
            }
          }
          if (seen) {
            this.recolorVerticesOnPoint(element);
          }
        });
      }, params.recolorIntervalMS);
    }
  }


  toggleDeemphasis() {
    // params.allowDeemphasis = !params.allowDeemphasis;
    console.log("Deemphasizing is", params.allowDeemphasis);
  }


  toggleEmphasis() {
    // params.allowEmphasis = !params.allowEmphasis;
    console.log("Emphasizing is", params.allowEmphasis);
  }
}






/**********
 *  CLASSLESS HELPER FUNCTIONS
 */


function assignColor(minCol, maxCol, minVal, maxVal, val) {
  if (val > maxVal) {
    return '#ff0000';  //'#fc7f00';
  }
  var colors = [];
  var minR = parseInt(minCol.substring(1, 3), 16);
  var maxR = parseInt(maxCol.substring(1, 3), 16);
  var minG = parseInt(minCol.substring(3, 5), 16);
  var maxG = parseInt(maxCol.substring(3, 5), 16);
  var minB = parseInt(minCol.substring(5, 7), 16);
  var maxB = parseInt(maxCol.substring(5, 7), 16);
  var valsRange = maxVal - minVal;
  var rangeG = maxG - minG;
  var rangeR = maxR - minR;
  var rangeB = maxB - minB;

  colors = '#'
    + getRBGComponent(rangeR, minR, valsRange, minVal, val)
    + getRBGComponent(rangeG, minG, valsRange, minVal, val)
    + getRBGComponent(rangeB, minB, valsRange, minVal, val);
  return colors;
}

function getRBGComponent(colRange, minCol, valRange, minVal, val) {
  return Math.round(((val - minVal) / valRange) * colRange + minCol)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
}

function compareAttention(a, b) {
  return a.attention - b.attention;
}

function compareID(a, b) {
  return a.id - b.id;
}


export { Visualization };