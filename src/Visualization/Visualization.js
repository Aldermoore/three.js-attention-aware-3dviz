import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';
import { createOrthograpichCamera } from './components/cameraOrthographic.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';
import { createControls } from './systems/controls.js'
import iris from './data/iris.json' assert {type: 'json'}; //Our data
import { ViewHelper } from './components/viewHelper.js';
// THREEjs libraries 
import TWEEN from '@tweenjs/tween.js'


let camera;
let renderer;
let scene;
let loop;
let viewHelper;

let dataPoints;
let pickingPoints;
let pickingScene;
let matrix;
let quaternion;
let color;
var pickingObjects = [],
  pickingMaterial, pickingTextureHover, pickingTextureAreaHover, pickingTextureOcclusion;
var objects = [];
var mousePick = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

const width = window.innerWidth;
const height = window.innerHeight;
const areaPickSize = 50;

const colorScale = ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB'];  // Blue, red, green, yellow, cyan, purple, grey. See https://personal.sron.nl/~pault/#sec:qualitative 
var attentionList;



// These are for showing that it works and should be removed as some point. 
var yellowmessage;
var tealmessage;
var hovermessage;
var frustummessage;



class Visualization {
  constructor(container) {
    camera = createCamera();
    // camera = createOrthograpichCamera(width, height);
    renderer = createRenderer();
    scene = createScene();
    loop = new Loop(camera, scene, renderer);
    container.append(renderer.domElement);
    window.addEventListener('mousemove', this.onMouseMove, false);


    dataPoints = new THREE.Group();
    pickingPoints = new THREE.Group();
    matrix = new THREE.Matrix4();
    quaternion = new THREE.Quaternion();
    color = new THREE.Color();
    // add buffer geometry to picking scene
    pickingScene = new THREE.Scene();
    pickingTextureHover = new THREE.WebGLRenderTarget(1, 1);
    pickingTextureAreaHover = new THREE.WebGLRenderTarget(50, 50);
    pickingTextureOcclusion = new THREE.WebGLRenderTarget(width, height); //, { format: THREE.RGBAFormat }); // window.innerWidth, window.innerHeight
    pickingMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true
    });


    // These are for showing that i works and should be removed as some point. 
    yellowmessage = document.getElementById('yellowmessage');
    tealmessage = document.getElementById('tealmessage');
    hovermessage = document.getElementById('hovermessage');
    frustummessage = document.getElementById('frustummessage');

    // const cube = createCube();
    const controls = createControls(camera, renderer.domElement);
    const { ambientLight, mainLight } = createLights();
    viewHelper = new ViewHelper(camera, container, controls);
    // loop.updatables.push(cube);

    scene.add(ambientLight, mainLight);

    // this.init();

    // scene.add(cube);
    const resizer = new Resizer(container, camera, renderer);
    resizer.onResize = () => {
      this.render(); // Technically not needed if we just constantly rerender each frame. 
    }
  }

  init() {
    // for (let index = 1; index <= 100; index++) {
    //   this.createSphere(index, 16776960 + index, new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50));
    // }
    // axes
    // scene.add(new THREE.AxesHelper(50));

    scene.add(dataPoints);
    pickingScene.add(pickingPoints);

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
    console.log(speciesList.length);

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

      // Old hardcoded version
      // this.createSphere(index + 1, color, new THREE.Vector3(element.sepalLength * 10 - 40 , element.sepalWidth * 10 - 20, element.petalWidth * 10), 0.5);

      // This version separates knowledge of the data obejct fro mteh visualisation. 
      // this.createSphere(index + 1, color, new THREE.Vector3(Object.values(element)[0] * 10 - 40, Object.values(element)[1] * 10 - 20, Object.values(element)[3] * 10), 0.5);
    }
    this.showLevelsOfAttentionOnAllPoints();
    // let nums = 123; 
    //console.log(assignColor('#e4ff7a','#fc7f00',0,3000,nums));
  }

  render() {
    // draw a single frame
    renderer.setViewport(0, 0, renderer.domElement?.offsetWidth, renderer.domElement?.offsetHeight);
    renderer.render(scene, camera);
    renderer.autoClear = false;
    viewHelper.render(renderer);
    renderer.autoClear = true;
    TWEEN.update();
  }

  start() {
    this.init();
    this.render();
    // loop.start();
    this.animate();
  }

  stop() {
    loop.stop();
  }

  animate() {
    renderer.setAnimationLoop(() => {
      this.render();
      this.isHoveringBuffer();
      this.checkForOcclusion();
      this.checkFrustum();
      let hoverID = this.isHoveringBuffer();
      let hoverIDs = this.isHoveringAreaBuffer();

      let notOccluded = dataPoints.children.filter((objects => objects.isOccluded === true));

      yellowmessage.innerHTML = "No. occlusions: " + notOccluded.length;
      let occludedMsg = "Occluded:";
      notOccluded.forEach((element => occludedMsg += " " + element.name));
      tealmessage.innerHTML = occludedMsg;

      let objNotInFrustum = dataPoints.children.filter((objects => objects.inFrustum === false));
      let frustumMsg = "Not in frustum:";
      objNotInFrustum.forEach((element => frustumMsg += " " + element.name));
      tealmessage.innerHTML = occludedMsg;
      frustummessage.innerHTML = frustumMsg;


      for (let i = 0; i < hoverIDs.length; i++) {
        if (hoverIDs[i] > 0) {
          this.increaseAttentionToPoint(hoverIDs[i]);
          this.updateAttentionColor(hoverIDs[i]);
        }
      }
      hovermessage.innerHTML = "hovering over object of ID: " + hoverIDs;
      /*
      if (hoverID > 0) {
        this.increaseAttentionToPoint(hoverID);
        this.updateAttentionColor(hoverID);
      }
      */
      // this.selectMarksWithSameAttribute(hoverID, "petalLength");
      // this.highLightMark(hoverID);
    });
  }

  /**
   * 
   * @param {number} id ID of the mesh created
   * @param {number} markColor Colour of the mesh created
   * @param {THREE.Vector3} position Vector position of the mesh created
   */
  createSphere(id, markColor, position, size) {
    let geometry = new THREE.SphereGeometry(size, 12, 8);
    let material = new THREE.MeshPhongMaterial({ color: markColor, flatShading: true, userData: { oldColor: markColor } });

    let sphere = new THREE.Mesh(geometry, material);
    sphere.name = id;
    sphere.position.set(position.x, position.y, position.z);

    let pickingSphere = this.createBuffer(geometry, sphere);
    let pickingMesh = new THREE.Mesh(pickingSphere, pickingMaterial);
    pickingMesh.name = id;
    dataPoints.add(sphere);
    pickingPoints.add(pickingMesh);
    return { sphere, pickingMesh };
  }

  checkForOcclusion() {
    renderer.setRenderTarget(pickingTextureOcclusion);
    renderer.render(pickingScene, camera);
    var pixelBuffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(pickingTextureOcclusion, 0, 0, width, height, pixelBuffer);
    renderer.setRenderTarget(null);
    var hexBuffer = this.rgbaToHex(pixelBuffer);

    dataPoints.children.forEach(element => {
      if (hexBuffer.includes(element.name)) {
        element.isOccluded = false;
      } else element.isOccluded = true;
    });
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
    // This if statement is just test code and should be removed
    //if (id != null) {
    //  hovermessage.innerHTML = "hovering over object of ID: " + id;
    // }
    if (id != null) {
      return id;
    } else return 0;
  }

  isHoveringAreaBuffer() {
    camera.setViewOffset(renderer.domElement.width, renderer.domElement.height, mousePick.x * window.devicePixelRatio - 25 | 0, mousePick.y * window.devicePixelRatio - 25 | 0, 50, 50);
    renderer.setRenderTarget(pickingTextureAreaHover);
    renderer.render(pickingScene, camera);
    camera.clearViewOffset();
    var pixelBuffer = new Uint8Array(50 * 50 * 4);
    renderer.readRenderTargetPixels(pickingTextureAreaHover, 0, 0, 50, 50, pixelBuffer);

    var hexBuffer = this.rgbaToHex(pixelBuffer);
    // var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
    renderer.setRenderTarget(null);
    // This if statement is just test code and should be removed
    //if (id != null) {
    //  hovermessage.innerHTML = "hovering over object of ID: " + id;
    // }
    let allZero = true;
    let IDs = [0];
    let j = 0;
    for (let i = 0; i < hexBuffer.length; i++) {
      if (hexBuffer[i] !== 0) {
        allZero = false;
        if (!IDs.includes(hexBuffer[i])) {
          IDs[j] = hexBuffer[i];
          j++;
        }
        // break;
      }
    }
    if (!allZero) {
      console.log(IDs);
    }

    return IDs;

    /*
    if (id != null) {
      return id;
    } else return 0;
    */
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


  hoveringRaycaster() {
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    return intersects[0];
  }

  isOccludedBuffer(object) {
    renderer.setRenderTarget(pickingTextureOcclusion);
    renderer.render(pickingScene, camera);
    var pixelBuffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(pickingTextureOcclusion, 0, 0, width, height, pixelBuffer);
    renderer.setRenderTarget(null);
    var hexBuffer = rgbaToHex(pixelBuffer);

    return !hexBuffer.includes(object.name);
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

  createBuffer(geometry, mesh) {
    var buffer = new THREE.SphereGeometry(geometry.parameters.radius, geometry.parameters.widthSegments, geometry.parameters.heightSegments); // SphereBufferGeometry
    quaternion.setFromEuler(mesh.rotation);
    matrix.compose(mesh.position, quaternion, mesh.scale);
    buffer.applyMatrix4(matrix);
    this.applyVertexColors(buffer, color.setHex(mesh.name));
    buffer.name = mesh.name;
    return buffer;
  }

  applyVertexColors(geometry, color) {
    // Color needs to be converted from Linear to SRGB because reasons 
    // (if not the color will be wrong for all but primary (e.g. R=1,B=0,G=0) and secondary (e.g. R=1,B=1,G=0) colors!)
    color.convertLinearToSRGB();
    var position = geometry.attributes.position;
    var colors = [];
    for (var i = 0; i < position.count; i++) {
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

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

  increaseAttentionToPoint(objectID) {
    if (objectID != 0) {
      iris[objectID - 1].attention++;
    }
  }



  showLevelsOfAttentionOnAllPoints() {
    let baseColor = new THREE.Color("#888888"); // #666666
    iris.sort(compareAttention);
    let maxAttention = iris[iris.length - 1];
    iris.sort(compareID);
    for (const element of dataPoints.children) {
      element.material.color = baseColor;
    }
  }

  updateAttentionColor(objectID, attention) {
    console.log("recolouring");
    for (const element of dataPoints.children) {
      if (element.name == objectID) {
        let newColor = assignColor('#ffff00', '#ff0000', 0, 30, iris[objectID - 1].attention); //  #e4ff7a
        this.recolorPoint(element, newColor);
      }
    }
  }

  recolorPoint(element, colorHex) {
    let color = new THREE.Color(colorHex);
    element.material.color = color;
  }
}

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

