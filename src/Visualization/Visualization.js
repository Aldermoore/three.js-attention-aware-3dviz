import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createCube } from './components/cube.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';

import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';
import { createControls } from './systems/controls.js'
import iris from './data/iris.json' assert {type: 'json'}; //Our data


let camera;
let renderer;
let scene;
let loop;

let dataPoints;
let pickingPoints;
let pickingScene;
let matrix;
let quaternion;
let color;
var pickingObjects = [],
  pickingMaterial, pickingTextureHover, pickingTextureOcclusion;
var objects = [];
var mousePick = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

class Visualization {
  constructor(container) {
    camera = createCamera();
    renderer = createRenderer();
    scene = createScene();
    loop = new Loop(camera, scene, renderer);
    container.append(renderer.domElement);

    dataPoints = new THREE.Group();
    pickingPoints = new THREE.Group();
    pickingScene = new THREE.Scene();
    matrix = new THREE.Matrix4();
    quaternion = new THREE.Quaternion();
    color = new THREE.Color();

    // const cube = createCube();
    const controls = createControls(camera, renderer.domElement);
    const { ambientLight, mainLight } = createLights();

    // loop.updatables.push(cube);

    scene.add(ambientLight, mainLight);

    this.init();

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
    scene.add(new THREE.AxesHelper(50));

    scene.add(dataPoints);
    pickingScene.add(pickingPoints);

    for (let index = 0; index < iris.length; index++) {

      const element = iris[index];

      this.createSphere(index + 1, 255 * (2*index + 1), new THREE.Vector3(element.sepalLength * 10-40, element.sepalWidth * 10-20, element.petalWidth * 10), 0.5);

    }
  }

  render() {
    // draw a single frame
    renderer.render(scene, camera);
  }

  start() {
    loop.start();
  }

  stop() {
    loop.stop();
  }

  /**
   * 
   * @param {number} id ID of the mesh created
   * @param {number} markColor Colour of the mesh created
   * @param {THREE.Vector3} position Vector position of the mesh created
   */
  createSphere(id, markColor, position, size) {
    let geometry = new THREE.SphereGeometry(size, 12, 8);
    let material = new THREE.MeshPhongMaterial({ color: markColor, flatShading: true });
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
    var hexBuffer = rgbaToHex(pixelBuffer);

    dataGroup.children.forEach(element => {
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
    return id;
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
    dataGroup.children.forEach(element => {
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
}

export { Visualization };
