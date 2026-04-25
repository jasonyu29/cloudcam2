import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const name = "monkey";

const MODE_FLOAT = "MODE_FLOAT";
const MODE_FACE_TRACK = "MODE_FACE_TRACK";
const MODE_CORNER = "MODE_CORNER";

let threeRenderer = null;
let scene = null;
let camera = null;
let suzanne = null;
let analyserRef = null;

let ambient = null;
let directional = null;
let rim = null;

let pmremGenerator = null;
let envTex = null;

let t = 0;

let driftX = 0;
let driftY = 0;
let driftVX = 0.002;
let driftVY = 0.0015;

let monkeyMode = MODE_FLOAT;
let monkeyScale = 0.9;

function init(_canvas, analyser) {
  analyserRef = analyser || null;

  threeRenderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  threeRenderer.setSize(1280, 720, false);
  threeRenderer.setPixelRatio(1);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.z = 3;

  ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  directional = new THREE.DirectionalLight(0xffffff, 1.5);
  directional.position.set(2, 3, 2);
  scene.add(directional);

  rim = new THREE.PointLight(0xff44aa, 2.0);
  rim.position.set(-2, 1, 1);
  scene.add(rim);

  pmremGenerator = new THREE.PMREMGenerator(threeRenderer);
  envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const loader = new GLTFLoader();
  loader.load(
    "https://threejs.org/examples/models/gltf/Suzanne/glTF/Suzanne.gltf",
    (gltf) => {
      suzanne = gltf.scene;
      suzanne.scale.setScalar(monkeyScale);

      const mat = new THREE.MeshPhysicalMaterial({
        metalness: 0.8,
        roughness: 0.15,
        color: 0xffffff,
        iridescence: 0.9,
        iridescenceIOR: 2.0,
        envMapIntensity: 1.5,
      });

      suzanne.traverse((obj) => {
        if (obj && obj.isMesh) {
          obj.material = mat;
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });

      scene.add(suzanne);
    },
  );
}

function getBass() {
  if (!analyserRef || !analyserRef.analyser || !analyserRef.dataArray) return 0;

  const { analyser, dataArray } = analyserRef;
  analyser.getByteFrequencyData(dataArray);

  const n = Math.min(4, dataArray.length);
  if (n <= 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) sum += dataArray[i];
  return sum / n / 255;
}

function centroid(points) {
  let x = 0;
  let y = 0;
  const n = points.length || 1;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / n, y: y / n };
}

function applyFloat(dt) {
  driftX += driftVX * dt;
  driftY += driftVY * dt;

  if (Math.abs(driftX) > 0.5) driftVX *= -1;
  if (Math.abs(driftY) > 0.3) driftVY *= -1;

  suzanne.position.x = driftX;
  suzanne.position.y = driftY + Math.sin(t * 1.2) * 0.05;
}

function applyCorner() {
  suzanne.position.x = 0.62;
  suzanne.position.y = -0.36;
}

function applyFaceTrack() {
  const dets = window.app && window.app.lastFaceDetections;
  if (!dets || dets.length === 0) {
    applyFloat(0);
    return;
  }

  const d = dets[0];
  const landmarks = d.landmarks;
  if (!landmarks) {
    applyFloat(0);
    return;
  }

  const jaw = landmarks.getJawOutline && landmarks.getJawOutline();
  if (!jaw || jaw.length < 17) {
    applyFloat(0);
    return;
  }

  const faceWidth = jaw[16].x - jaw[0].x;

  const box = d.detection && d.detection.box;
  const cxPx = box ? box.x + box.width / 2 : centroid(jaw).x;
  const cyPx = box ? box.y + box.height / 2 : centroid(jaw).y;

  const xNdc = (cxPx / 1280) * 2 - 1;
  const yNdc = (cyPx / 720) * 2 - 1;

  suzanne.position.x = xNdc * 0.75;
  suzanne.position.y = -yNdc * 0.45;

  const s = faceWidth * 0.014;
  suzanne.scale.setScalar(s);
}

function render(ctx, _videoEl, dt) {
  if (!threeRenderer || !scene || !camera) return;
  if (!suzanne) {
    threeRenderer.render(scene, camera);
    return;
  }

  const dts = dt || 0;
  t += dts;

  const bass = getBass();

  if (monkeyMode === MODE_CORNER) {
    applyCorner();
    suzanne.scale.setScalar(0.4);
  } else if (monkeyMode === MODE_FACE_TRACK) {
    applyFaceTrack();
  } else {
    applyFloat(dts);
    suzanne.scale.setScalar(monkeyScale + bass * 0.4);
  }

  suzanne.rotation.y += 0.008 * dts;
  suzanne.rotation.x = Math.sin(t * 0.7) * 0.15;

  if (rim) {
    rim.intensity = 2.0 + bass * 4.0;
  }

  threeRenderer.render(scene, camera);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(threeRenderer.domElement, 0, 0, 1280, 720);
  ctx.restore();
}

function destroy() {
  if (scene && envTex) {
    envTex.dispose?.();
    envTex = null;
    scene.environment = null;
  }

  if (pmremGenerator) {
    pmremGenerator.dispose();
    pmremGenerator = null;
  }

  if (threeRenderer) {
    threeRenderer.dispose();
    threeRenderer = null;
  }

  scene = null;
  camera = null;
  suzanne = null;
  analyserRef = null;

  ambient = null;
  directional = null;
  rim = null;

  t = 0;
}

function setMonkeyMode(nextMode) {
  if (nextMode === MODE_FLOAT || nextMode === MODE_FACE_TRACK || nextMode === MODE_CORNER) {
    monkeyMode = nextMode;
  }
}

function setMonkeyScale(v) {
  if (!Number.isFinite(v)) return;
  monkeyScale = v;
  if (suzanne && monkeyMode === MODE_FLOAT) {
    suzanne.scale.setScalar(monkeyScale);
  }
}

export default {
  name,
  init,
  render,
  destroy,
  setMonkeyMode,
  setMonkeyScale,
  MODE_FLOAT,
  MODE_FACE_TRACK,
  MODE_CORNER,
};
