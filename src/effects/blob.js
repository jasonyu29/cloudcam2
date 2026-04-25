import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const name = "blob";

let threeRenderer = null;
let scene = null;
let camera = null;
let marchingCubes = null;
let material = null;
let pmremGenerator = null;
let analyserRef = null;

let t = 0;
let blobSpeed = 1.0;
let blobOpacity = 0.85;

function init(_canvas, analyser) {
  analyserRef = analyser || null;

  threeRenderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  threeRenderer.setSize(1280, 720, false);
  threeRenderer.setPixelRatio(1);
  threeRenderer.setClearColor(0x000000, 0);
  threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
  camera.position.z = 4;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const point = new THREE.PointLight(0xffffff, 2);
  point.position.set(2, 2, 2);
  scene.add(point);

  material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0,
    transmission: 1.0,
    thickness: 1.5,
    iridescence: 1.0,
    iridescenceIOR: 1.8,
    envMapIntensity: 1.5,
  });

  marchingCubes = new MarchingCubes(28, material, true, true, 100000);
  marchingCubes.isolation = 80;
  scene.add(marchingCubes);

  pmremGenerator = new THREE.PMREMGenerator(threeRenderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
}

function render(ctx, _videoEl, dt) {
  if (!threeRenderer || !scene || !camera || !marchingCubes) return;

  t += (dt || 0) * blobSpeed;

  marchingCubes.reset();

  let strengthScale = 1;
  if (analyserRef && analyserRef.analyser && analyserRef.dataArray) {
    analyserRef.analyser.getByteFrequencyData(analyserRef.dataArray);
    const n = Math.min(5, analyserRef.dataArray.length);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += analyserRef.dataArray[i];
    const bass = n > 0 ? sum / n / 255 : 0;
    strengthScale = 1 + bass * 0.8;
  }

  const baseStrength = 0.5 * strengthScale;

  const balls = 4;
  for (let i = 0; i < balls; i++) {
    const phase = (i / balls) * Math.PI * 2;
    const speed = 0.9 + i * 0.15;

    const x = Math.sin(t * speed + phase) * 0.4;
    const y = Math.cos(t * (speed * 1.1) + phase * 1.3) * 0.4;
    const z = Math.sin(t * (speed * 0.7) + phase * 0.6) * 0.4;

    marchingCubes.addBall(0.5 + x, 0.5 + y, 0.5 + z, baseStrength, 0);
  }

  threeRenderer.render(scene, camera);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = blobOpacity;
  ctx.drawImage(threeRenderer.domElement, 0, 0, 1280, 720);
  ctx.restore();
}

function destroy() {
  if (scene && scene.environment) {
    scene.environment.dispose?.();
    scene.environment = null;
  }

  if (pmremGenerator) {
    pmremGenerator.dispose();
    pmremGenerator = null;
  }

  if (marchingCubes) {
    scene?.remove(marchingCubes);
    marchingCubes = null;
  }

  if (material) {
    material.dispose();
    material = null;
  }

  if (threeRenderer) {
    threeRenderer.dispose();
    threeRenderer = null;
  }

  scene = null;
  camera = null;
  analyserRef = null;
  t = 0;
}

function setBlobSpeed(v) {
  if (Number.isFinite(v)) blobSpeed = v;
}

function setBlobOpacity(v) {
  if (Number.isFinite(v)) blobOpacity = Math.max(0, Math.min(1, v));
}

export default {
  name,
  init,
  render,
  destroy,
  setBlobSpeed,
  setBlobOpacity,
};
