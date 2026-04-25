const name = "glitch";

let offscreen = null;
let offCtx = null;
let glitchIntensity = 0.35;
let frameCounter = 0;

function clamp01(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function ensureOffscreen() {
  if (offscreen && offCtx) return;

  offscreen = document.createElement("canvas");
  offscreen.width = 1280;
  offscreen.height = 720;
  offCtx = offscreen.getContext("2d", { willReadFrequently: true });
}

function shiftSlice(img, y, h, shiftPx) {
  const { width, data } = img;
  const rowBytes = width * 4;

  const shift = Math.trunc(shiftPx);
  if (shift === 0) return;

  const shiftBytes = Math.abs(shift) * 4;
  if (shiftBytes >= rowBytes) return;

  for (let row = y; row < y + h; row++) {
    if (row < 0 || row >= img.height) continue;

    const rowStart = row * rowBytes;

    if (shift > 0) {
      const tmp = data.slice(rowStart + rowBytes - shiftBytes, rowStart + rowBytes);
      data.copyWithin(rowStart + shiftBytes, rowStart, rowStart + rowBytes - shiftBytes);
      data.set(tmp, rowStart);
    } else {
      const tmp = data.slice(rowStart, rowStart + shiftBytes);
      data.copyWithin(rowStart, rowStart + shiftBytes, rowStart + rowBytes);
      data.set(tmp, rowStart + rowBytes - shiftBytes);
    }
  }
}

function applyChannelBleed(img, intensity) {
  if (intensity <= 0) return;

  const { data, width, height } = img;
  const total = width * height;
  const corruptCount = Math.floor(total * 0.0005 * intensity);

  for (let i = 0; i < corruptCount; i++) {
    const idx = (Math.random() * total) | 0;
    data[idx * 4 + 0] = 240;
  }
}

function init(_canvas, _analyser) {
  ensureOffscreen();
}

function render(ctx, videoEl, _dt) {
  if (!videoEl) return;
  ensureOffscreen();

  frameCounter++;

  offCtx.clearRect(0, 0, 1280, 720);
  try {
    offCtx.drawImage(videoEl, 0, 0, 1280, 720);
  } catch {
    return;
  }

  let img;
  try {
    img = offCtx.getImageData(0, 0, 1280, 720);
  } catch {
    return;
  }

  const intensity = clamp01(glitchIntensity);

  const slicePeriod = Math.max(2, Math.round(8 - intensity * 6));
  if (intensity > 0 && frameCounter % slicePeriod === 0) {
    const sliceCount = Math.floor(3 + Math.random() * 6);
    const shift = (10 + intensity * 30) * (Math.random() < 0.5 ? -1 : 1);

    for (let i = 0; i < sliceCount; i++) {
      const y = (Math.random() * 720) | 0;
      const h = (4 + Math.random() * 16) | 0;
      shiftSlice(img, y, h, shift);
    }
  }

  applyChannelBleed(img, intensity);

  ctx.save();
  ctx.putImageData(img, 0, 0);

  if (Math.random() < intensity * 0.15) {
    ctx.globalAlpha = 0.4;
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(0, 120, 255, 0.22)";
    ctx.fillRect(0, 0, 1280, 720);

    ctx.drawImage(offscreen, 0, 2, 1280, 720);
  }

  ctx.restore();
}

function destroy() {
  offscreen = null;
  offCtx = null;
  frameCounter = 0;
}

function setGlitchIntensity(v) {
  glitchIntensity = clamp01(Number(v));
}

export default {
  name,
  init,
  render,
  destroy,
  setGlitchIntensity,
};
