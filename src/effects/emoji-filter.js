const name = "emoji-filter";

const MODE_CLASSIC = "classic";
const MODE_FULL_FACE = "full-face";
const MODE_CROWN = "crown";
const MODE_SUNGLASSES = "sunglasses";

let canvasRef = null;

let faceapiReady = false;
let loadingPromise = null;

let offscreen = null;
let offCtx = null;

let detectionInterval = 80;
let lastDetections = [];
let detectionTimer = null;
let destroyed = false;
let lastVideoEl = null;

let emojiMode = MODE_CLASSIC;
let emojiOverlays = {
  leftEye: "🕶",
  rightEye: "🕶",
  mouth: "🤐",
  nose: "🐷",
  face: ["🐸", "🤖", "👻", "🐱", "🦊", "😈"],
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.loaded = "false";
    s.addEventListener("load", () => {
      s.dataset.loaded = "true";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(s);
  });
}

async function ensureFaceApi() {
  if (faceapiReady) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await loadScript("https://cdn.jsdelivr.net/npm/face-api.js/dist/face-api.min.js");

    const faceapi = window.faceapi;
    if (!faceapi) {
      throw new Error("face-api.js did not initialize (window.faceapi missing)");
    }

    await faceapi.nets.tinyFaceDetector.loadFromUri(
      "https://cdn.jsdelivr.net/npm/face-api.js/weights",
    );
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
      "https://cdn.jsdelivr.net/npm/face-api.js/weights",
    );

    faceapiReady = true;
  })();

  return loadingPromise;
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

function ensureOffscreen() {
  if (offscreen && offCtx) return;
  offscreen = document.createElement("canvas");
  offscreen.width = 1280;
  offscreen.height = 720;
  offCtx = offscreen.getContext("2d", { willReadFrequently: true });
}

function scheduleDetection() {
  if (destroyed) return;
  if (!lastVideoEl) {
    detectionTimer = setTimeout(scheduleDetection, detectionInterval);
    return;
  }

  detectionTimer = setTimeout(async () => {
    if (destroyed) return;

    try {
      await ensureFaceApi();
    } catch (err) {
      console.error("emoji-filter: failed to load face-api.js/models", err);
      return;
    }

    const faceapi = window.faceapi;
    if (!faceapi) return;

    ensureOffscreen();

    try {
      offCtx.clearRect(0, 0, 1280, 720);
      offCtx.drawImage(lastVideoEl, 0, 0, 1280, 720);

      const detections = await faceapi
        .detectAllFaces(offscreen, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      lastDetections = detections || [];
      if (window.app) {
        window.app.lastFaceDetections = lastDetections;
      }
    } catch {
      // ignore detection errors
    }

    scheduleDetection();
  }, detectionInterval);
}

function init(canvas, _analyser) {
  canvasRef = canvas;
  destroyed = false;

  ensureOffscreen();

  scheduleDetection();
}

function renderClassic(ctx, landmarks, emojiSize) {
  const leftEye = centroid(landmarks.getLeftEye());
  const mouth = centroid(landmarks.getMouth());
  const nose = centroid(landmarks.getNose());

  ctx.font = `${emojiSize}px serif`;

  const eEye = emojiOverlays.leftEye || "🕶";
  ctx.fillText(eEye, leftEye.x - emojiSize / 2, leftEye.y + emojiSize / 3);

  const eMouth = emojiOverlays.mouth || "🤐";
  ctx.fillText(eMouth, mouth.x - emojiSize / 2, mouth.y + emojiSize / 3);

  const eNose = emojiOverlays.nose || "🐷";
  ctx.fillText(eNose, nose.x - emojiSize / 2, nose.y + emojiSize / 3);
}

function renderFullFace(ctx, detection, faceWidth) {
  const t = performance.now();
  const list = Array.isArray(emojiOverlays.face) && emojiOverlays.face.length > 0
    ? emojiOverlays.face
    : ["🐸", "🤖", "👻", "🐱", "🦊", "😈"];

  const idx = Math.floor(t / 2000) % list.length;
  const emoji = list[idx];

  const size = faceWidth * 1.1;
  const box = detection.detection.box;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  ctx.font = `${size}px serif`;
  ctx.fillText(emoji, cx - size / 2, cy + size / 3);
}

function renderCrown(ctx, detection, faceWidth, emojiSize) {
  const box = detection.detection.box;
  const cx = box.x + box.width / 2;
  const topY = box.y;

  ctx.font = `${emojiSize}px serif`;
  ctx.fillText("👑", cx - emojiSize / 2, topY - emojiSize * 0.4);

  const sparkleCount = Math.floor(6 + faceWidth * 0.02);
  const topBandH = box.height * 0.2;

  ctx.font = `${emojiSize * 0.5}px serif`;

  for (let i = 0; i < sparkleCount; i++) {
    const x = box.x + Math.random() * box.width;
    const y = box.y + Math.random() * topBandH;
    ctx.fillText("✨", x, y);
  }
}

function renderSunglasses(ctx, landmarks) {
  const leftEye = centroid(landmarks.getLeftEye());
  const rightEye = centroid(landmarks.getRightEye());

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const span = Math.hypot(dx, dy);
  if (span < 1) return;

  const angle = Math.atan2(dy, dx);
  const size = span * 1.4;
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.font = `${size}px serif`;
  ctx.fillText("🕶", -size / 2, size / 3);
  ctx.restore();
}

function render(ctx, videoEl, _dt) {
  if (videoEl) lastVideoEl = videoEl;
  if (!lastDetections || lastDetections.length === 0) return;

  ctx.save();

  for (const d of lastDetections) {
    const landmarks = d.landmarks;
    if (!landmarks) continue;

    const jaw = landmarks.getJawOutline();
    if (!jaw || jaw.length < 17) continue;

    const faceWidth = jaw[16].x - jaw[0].x;
    const emojiSize = faceWidth * 0.35;

    if (emojiMode === MODE_CLASSIC) {
      renderClassic(ctx, landmarks, emojiSize);
    } else if (emojiMode === MODE_FULL_FACE) {
      renderFullFace(ctx, d, faceWidth);
    } else if (emojiMode === MODE_CROWN) {
      renderCrown(ctx, d, faceWidth, emojiSize);
    } else {
      renderSunglasses(ctx, landmarks);
    }
  }

  ctx.restore();
}

function destroy() {
  destroyed = true;

  if (detectionTimer) {
    clearTimeout(detectionTimer);
    detectionTimer = null;
  }

  lastDetections = [];
  lastVideoEl = null;
  offscreen = null;
  offCtx = null;
  canvasRef = null;
}

function setEmojiMode(nextMode) {
  if (
    nextMode === MODE_CLASSIC ||
    nextMode === MODE_FULL_FACE ||
    nextMode === MODE_CROWN ||
    nextMode === MODE_SUNGLASSES
  ) {
    emojiMode = nextMode;
  }
}

function setEmojiOverlay(slot, emoji) {
  if (typeof emoji !== "string" || emoji.length === 0) return;

  if (slot === "face") {
    emojiOverlays.face = [emoji];
    return;
  }

  if (slot === "leftEye" || slot === "rightEye" || slot === "mouth" || slot === "nose") {
    emojiOverlays[slot] = emoji;
  }
}

export default {
  name,
  init,
  render,
  destroy,
  setEmojiMode,
  setEmojiOverlay,
  MODE_CLASSIC,
  MODE_FULL_FACE,
  MODE_CROWN,
  MODE_SUNGLASSES,
};
