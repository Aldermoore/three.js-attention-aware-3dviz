import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createOrthograpichCamera } from './components/cameraOrthographic.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';
import { createControls } from './systems/controls.js'
import iris from './data/iris.json' assert {type: 'json'}; //Our data
// import { ViewHelper } from './components/viewHelper.js';
// THREEjs libraries 
import TWEEN from '@tweenjs/tween.js'

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
// WebXR stuff
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { HTMLMesh } from 'three/addons/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/addons/interactive/InteractiveGroup.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


let vizContainer;
let camera;
let renderer;
let scene;
let loop;
// let viewHelper;
let stats;

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


let experimentStarted = false;
var liveUpdate = false;



// WebXR stuff 
let controller;
let gui;
let group;


// These are for showing that it works and should be removed as some point. 
var yellowmessage;
var tealmessage;
var hovermessage;
var frustummessage;

var visibleObjectsDiv;


const params = {
  x: 0,
  y: 0,
  z: 0,
  areaPickSize: 51, //should be an odd number!!
  Start: function () { },
  Stop: function () { },
  Show_Results: function () { },
  Reset: function () { },
  LiveUpdate: true,
  AllowDeemphasis: true,
  AllowEmphasis: true,
  resetColors: function () { }
};

var viz;


class Visualization {

  centerRow;
  centerColumn;
  radius;
  radiusSquared;


  constructor(container) {

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


    // These are for showing that i works and should be removed as some point. 
    yellowmessage = document.getElementById('yellowmessage');
    tealmessage = document.getElementById('tealmessage');
    hovermessage = document.getElementById('hovermessage');
    frustummessage = document.getElementById('frustummessage');


    const controls = createControls(camera, renderer.domElement);
    const { ambientLight, mainLight } = createLights();
    // viewHelper = new ViewHelper(camera, container, controls);


    scene.add(ambientLight, mainLight);


    const resizer = new Resizer(container, camera, renderer);
    resizer.onResize = () => {
      this.render(); // Technically not needed if we just constantly rerender each frame. 
    }


    /**
     * WebXR stuff
     */
    document.body.appendChild(ARButton.createButton(renderer));
    renderer.xr.enabled = true;

    // Controller for the handheld controller 
    controller = renderer.xr.getController(0);
    controller.addEventListener('move', this.onMouseMove);
    scene.add(controller);

  }

  /**
   * initialise the visualisation environment
   */
  init() {
    scene.add(dataPoints);
    pickingScene.add(pickingPoints);

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
    // console.log(speciesList.length);

    let xAttrMax = Math.max.apply(null, iris.map(function (o) { return o.sepalLength }));
    let xAttrMin = Math.min.apply(null, iris.map(function (o) { return o.sepalLength }));

    let yAttrMax = Math.max.apply(null, iris.map(function (o) { return o.sepalWidth }));
    let yAttrMin = Math.min.apply(null, iris.map(function (o) { return o.sepalWidth }));

    let zAttrMax = Math.max.apply(null, iris.map(function (o) { return o.petalWidth }));
    let zAttrMin = Math.min.apply(null, iris.map(function (o) { return o.petalWidth }));

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
      let xVal = this.map_range(element.sepalLength, xAttrMin, xAttrMax, -25, 25);
      let yVal = this.map_range(element.sepalWidth, yAttrMin, yAttrMax, -25, 25);
      let zVal = this.map_range(element.petalWidth, zAttrMin, zAttrMax, -25, 25);

      // TODO: Nice way to bind data-dimensions to scene dimensions (X,Y,Z), and to mark-attributes (size, height/width/thickness, colour, orientation) depending on the type of mark. 
      // TODO: Normalise input data to a desired, configurable size of the visualization. 
      this.createSphere(index + 1, color, new THREE.Vector3(xVal, yVal, zVal), 0.5);

    } // for


    // visibleObjectsDiv = new HTMLMesh( hovermessage.dom );
    // visibleObjectsDiv.height = 100;
    // visibleObjectsDiv.width = 100; 
    // visibleObjectsDiv.position.x = 0.75;
    // visibleObjectsDiv.position.y = 0;
    // visibleObjectsDiv.position.z = 0.5;
    // visibleObjectsDiv.rotation.y = Math.PI / 2;
    // // mesh.scale.setScalar( 2 );
    // group.add( visibleObjectsDiv ); 

  }

  makeGUI() {
    gui = new GUI();
    const folder = gui.addFolder('Dataset properties');
    folder.add(params, 'x');
    folder.add(params, 'y');
    folder.add(params, 'z');
    folder.close();
    const areaPick = gui.add(params, 'areaPickSize', 11, 501, 10);
    areaPick.name("Size of gaze area (px Ø)")
    areaPick.onFinishChange(function (v) {
      console.log('The picking size is now ' + v);
      params.areaPickSize = v;
      viz.calculatePickingArea(); // calculatePickingArea(); 
    });

    const expSettings = gui.addFolder('Experiment Settings');
    expSettings.add(params, 'Start').name("Start data collection").onChange(viz.startExperiment());
    expSettings.add(params, 'Stop').name("Stop data collection").onChange(this.stopExperiment());
    expSettings.add(params, 'Show_Results').name("Show cumulative attention").onChange(this.showExperimentResults());
    expSettings.add(params, 'Reset').name("Reset/discard collected data").onChange(this.resetExperimentData());
    expSettings.add(params, "LiveUpdate").name("Show realtime cumulative attention").onFinishChange(value => {
      this.toggleLiveUpdate(value);
    });
    expSettings.add(params, "AllowDeemphasis").name("Allow deemphasis of points").onChange(value => {
      this.toggleDeemphasis(value);
    });
    expSettings.add(params, "AllowEmphasis").name("Allow emphasis of points").onChange(value => {
      this.toggleEmphasis(value);
    });
    expSettings.add(params, 'resetColors').name("Reset colours of the visualization").onChange(this.resetColorsOnAllPoints());

    gui.open();
    gui.domElement.style.visibility = 'hidden';

    group = new InteractiveGroup(renderer, camera);
    scene.add(group);

    const mesh = new HTMLMesh(gui.domElement);
    mesh.position.x = -0.75;
    mesh.position.y = 0;
    mesh.position.z = -0.5;
    mesh.rotation.y = Math.PI / 4;
    // mesh.scale.setScalar( 2 );
    group.add(mesh);

    stats = new Stats();
    vizContainer.appendChild(stats.dom);
    stats.dom.style.width = '80px';
    stats.dom.style.height = '48px';

    const statsMesh = new HTMLMesh(stats.dom);
    statsMesh.position.x = - 0.75;
    statsMesh.position.y = 0.5;
    statsMesh.position.z = - 0.6;
    statsMesh.rotation.y = Math.PI / 4;
    // statsMesh.scale.setScalar( 2.5 );
    group.add(statsMesh);
  }


  start() {
    this.makeGUI();
    this.init();
    this.render();
    this.animate();
    this.toggleLiveUpdate();
    this.startExperiment();
  }


  stop() {
    loop.stop();
  }


  render() {
    // draw a single frame
    // renderer.setViewport(0, 0, renderer.domElement?.offsetWidth, renderer.domElement?.offsetHeight);
    renderer.render(scene, camera);
    // renderer.autoClear = false;
    // // viewHelper.render(renderer);
    // renderer.autoClear = true;
    // TWEEN.update();
  }


  animate() {
    renderer.setAnimationLoop(() => {
      this.render();

      screenBuffer = this.checkForOcclusion();
      this.checkFrustum();

      stats.update();

      // We only use attention aware strategies if the experiment is running and we are not currently live-showing the cumulative attention 
      if (experimentStarted && !liveUpdate) {
        // console.log(tempObjectAttentionStore);
        for (const element of dataPoints.children) {

          if (params.AllowDeemphasis && tempObjectAttentionStore[element.name] > deemphasizeThreshold) { // check if point needs to be deemphasised
            triggeredStore[element.name] = true;
            // deemphasizing 
            element.material.color.lerp(new THREE.Color("#555555"), 0.05);

          } else if (params.AllowEmphasis && tempObjectAttentionStore[element.name] < emphasizeThreshold) { // check if point needs to be emphasised 

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
    renderer.setRenderTarget(pickingTextureOcclusion);
    renderer.render(pickingScene, camera);
    var pixelBuffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(pickingTextureOcclusion, 0, 0, width, height, pixelBuffer); // width, height 
    renderer.setRenderTarget(null);
    var hexBuffer = this.rgbaToHex(pixelBuffer);

    // dataPoints.children.forEach(element => {
    //   if (hexBuffer.includes(element.name)) {
    //     element.isOccluded = false;
    //   } else element.isOccluded = true;
    // });
    return hexBuffer;
  }


  isHoveringAreaBuffer(buffer) {
    let subBuffer = [];
    let viewPortWidth = width; 
    let viewPortHeight = height; 
    let session = renderer.xr.getSession(); 
    if (session && renderer.xr.isPresenting) {
      session.requestAnimationFrame(() => {
        // Access the baseLayer of the render
        const baseLayer = session.renderState.baseLayer;
        // Log each view (eye)'s viewport size
        if (baseLayer.getViewport) { // if viewport exists
          const views = session.renderState.layers[0].views;
          views.forEach((view, index) => {
            const viewport = baseLayer.getViewport(view);
            console.log("Viewport", index,": width = ",viewport.width, "height =",viewport.height);
            viewPortWidth = viewport.width; 
            viewPortHeight = viewport.height; 
          });
        }
      });
      subBuffer = this.findAreaFromArray(buffer, params.areaPickSize, 1000, 0); // mousePick.x, mousePick.y); quest 3 res: 1680x1760 // 1000 works well for width!! 
    } else {
      console.log('WebXR session is not started or available.');
      subBuffer = this.findAreaFromArray(buffer, params.areaPickSize, width / 2, height / 2); // mousePick.x, mousePick.y); quest 3 res: 1680x1760 // 1000 works well for width!! 
    }
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


  findAreaFromArray(array, squareSize, xCor, yCor) {
    yCor = Math.abs(yCor - height); // reversing the Y-coordinate
    let row = 0;
    let column = 0;
    let startRow = Math.ceil(yCor - squareSize / 2);
    startRow = startRow < 0 ? 0 : startRow;
    let endRow = Math.floor(yCor + squareSize / 2);
    endRow = endRow > height ? height : endRow;
    let startCol = Math.ceil(xCor - squareSize / 2);
    startCol = startCol < 0 ? 0 : startCol;
    let endCol = Math.floor(xCor + squareSize / 2);
    endCol = endCol > width ? width : endCol;
    let subArray = []

    for (let index = 0; index < array.length; index++) {
      if (row >= startRow && row <= endRow && column >= startCol && column <= endCol) {
        subArray.push(array[index]);
      }
      column++;
      if (column >= width) {
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
    experimentStarted = true;
    attentionID = setInterval(() => {
      let subBuffer = this.isHoveringAreaBuffer(screenBuffer);
      // let subBuffer = this.isHoveringAreaBufferStandalone(); 
      let circleBuffer = this.circleFromSquareBuffer(subBuffer);
      this.addAttentionToFaces(circleBuffer);
      this.increaseAttentionToPoint(circleBuffer);
    }, attentionIntervalMS);
    decayID = setInterval(() => {
      this.decayTempAttention();
    }, decayRate);
  }


  stopExperiment() {
    console.log("Data collection stopped!");
    experimentStarted = false;
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
    if (liveUpdate) {
      liveUpdate = false;
      console.log("Live preview of cumulative attention turned off");
      clearInterval(reColorID);
      reColorID = null;
    } else {
      liveUpdate = true;
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
      }, recolorIntervalMS);
    }
  }


  toggleDeemphasis() {
    params.allowDeemphasis = !params.allowDeemphasis;
    console.log("Deemphasizing is", params.allowDeemphasis);
  }


  toggleEmphasis() {
    params.allowEmphasis = !params.allowEmphasis;
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

