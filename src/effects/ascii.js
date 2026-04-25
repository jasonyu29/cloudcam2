const name = "ascii";

const CHARS = " .·:-=+*#%@";

let offscreen = null;
let offCtx = null;

let fontSize = 14;
let colorMode = "green";
let invertBrightness = false;

let charLut = null;
let timeAcc = 0;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function init() {
  offscreen = document.createElement("canvas");
  offscreen.width = 160;
  offscreen.height = 90;
  offCtx = offscreen.getContext("2d", { willReadFrequently: true });

  charLut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const b = i / 255;
    const idx = Math.floor(b * 10);
    charLut[i] = clamp(idx, 0, 10);
  }
}

function render(ctx, videoEl, dt) {
  if (!offCtx || !offscreen) init();
  if (!videoEl) return;

  timeAcc += dt || 0;

  try {
    offCtx.drawImage(videoEl, 0, 0, 160, 90);
  } catch {
    return;
  }

  let img;
  try {
    img = offCtx.getImageData(0, 0, 160, 90);
  } catch {
    return;
  }

  const data = img.data;

  ctx.save();

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1280, 720);

  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "alphabetic";

  const cellW = 1280 / 160;
  const cellH = 720 / 90;

  for (let y = 0; y < 90; y++) {
    const rowOffset = y * 160 * 4;

    for (let x = 0; x < 160; x++) {
      const i = rowOffset + x * 4;
      const r = data[i + 0];
      const g = data[i + 1];
      const b = data[i + 2];

      const bright = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
      let idx = charLut[bright];
      if (invertBrightness) idx = 10 - idx;

      const ch = CHARS[idx];

      if (colorMode === "green") {
        ctx.fillStyle = "#00ff41";
      } else if (colorMode === "white") {
        ctx.fillStyle = "#ffffff";
      } else {
        const hue = (x / 160) * 360 + timeAcc * 20;
        ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
      }

      ctx.fillText(ch, x * cellW, y * cellH + cellH);
    }
  }

  ctx.restore();
}

function destroy() {
  offscreen = null;
  offCtx = null;
  charLut = null;
  timeAcc = 0;
}

function setFontSize(px) {
  const v = Number(px);
  if (Number.isFinite(v) && v > 0) fontSize = v;
}

function setColorMode(mode) {
  if (mode === "green" || mode === "white" || mode === "rainbow") {
    colorMode = mode;
  }
}

function setInvert(bool) {
  invertBrightness = Boolean(bool);
}

export default {
  name,
  init,
  render,
  destroy,
  setFontSize,
  setColorMode,
  setInvert,
};
