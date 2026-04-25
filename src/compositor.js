let canvas = null;
let ctx = null;

const activeEffects = new Map();
let videoEl = null;
let audioAnalyser = null;
let running = false;
let rafId = null;
let lastTs = null;

function ensureCanvas() {
  if (canvas && ctx) return;

  canvas = document.getElementById("output-canvas");

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "output-canvas";
    canvas.width = 1280;
    canvas.height = 720;
    document.body.appendChild(canvas);
  } else {
    canvas.width = 1280;
    canvas.height = 720;
  }

  ctx = canvas.getContext("2d");
}

function validateEffect(module) {
  const errors = [];

  if (!module || typeof module !== "object") {
    errors.push("Effect module must be an object.");
  } else {
    if (typeof module.name !== "string" || module.name.length === 0) {
      errors.push("Effect module must have a non-empty string 'name'.");
    }
    if (typeof module.init !== "function") {
      errors.push("Effect module must have an 'init(canvas, analyser)' function.");
    }
    if (typeof module.render !== "function") {
      errors.push("Effect module must have a 'render(ctx, videoEl, dt)' function.");
    }
    if (typeof module.destroy !== "function") {
      errors.push("Effect module must have a 'destroy()' function.");
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  return true;
}

function renderFrame(ts) {
  if (!running) return;

  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  ctx.clearRect(0, 0, 1280, 720);

  if (videoEl) {
    try {
      ctx.drawImage(videoEl, 0, 0, 1280, 720);
    } catch {
      // Ignore draw errors until video has dimensions.
    }
  }

  const drawingEffect = activeEffects.get("drawing");

  for (const [name, effect] of activeEffects) {
    if (name === "drawing") continue;
    try {
      effect.render(ctx, videoEl, dt);
    } catch (err) {
      console.error(`Effect render failed: ${name}`, err);
    }
  }

  if (drawingEffect) {
    try {
      drawingEffect.render(ctx, videoEl, dt);
    } catch (err) {
      console.error("Effect render failed: drawing", err);
    }
  }

  rafId = requestAnimationFrame(renderFrame);
}

function init(nextVideoEl, nextAudioAnalyser = null) {
  ensureCanvas();

  videoEl = nextVideoEl;
  audioAnalyser = nextAudioAnalyser;

  start();
}

function enableEffect(name, module) {
  ensureCanvas();

  validateEffect(module);

  if (activeEffects.has(name)) {
    disableEffect(name);
  }

  module.init(canvas, audioAnalyser);
  activeEffects.set(name, module);
}

function disableEffect(name) {
  const effect = activeEffects.get(name);
  if (!effect) return;

  try {
    effect.destroy();
  } catch (err) {
    console.error(`Effect destroy failed: ${name}`, err);
  }

  activeEffects.delete(name);
}

function start() {
  if (running) return;

  ensureCanvas();
  running = true;
  lastTs = null;

  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  rafId = requestAnimationFrame(renderFrame);
}

function stop() {
  running = false;

  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export { init, enableEffect, disableEffect, start, stop, canvas };
