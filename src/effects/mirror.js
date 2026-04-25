const name = "mirror";

const MODE_HORIZONTAL = "MODE_HORIZONTAL";
const MODE_QUAD = "MODE_QUAD";
const MODE_KALEIDOSCOPE = "MODE_KALEIDOSCOPE";

let mode = MODE_HORIZONTAL;
let kalaAngle = 0;

function init(_canvas, _analyser) {}

function setMirrorMode(nextMode) {
  if (nextMode === MODE_HORIZONTAL || nextMode === MODE_QUAD || nextMode === MODE_KALEIDOSCOPE) {
    mode = nextMode;
  }
}

function renderHorizontal(ctx, videoEl) {
  ctx.save();

  ctx.translate(1280, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(videoEl, 0, 0, 640, 720, 0, 0, 640, 720);

  ctx.restore();
}

function renderQuad(ctx, videoEl) {
  const qw = 640;
  const qh = 360;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, qw, qh);
  ctx.clip();
  ctx.drawImage(videoEl, 0, 0, qw, qh, 0, 0, qw, qh);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(qw, 0, qw, qh);
  ctx.clip();
  ctx.translate(qw * 2, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, qw, qh, 0, 0, qw, qh);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, qh, qw, qh);
  ctx.clip();
  ctx.translate(0, qh * 2);
  ctx.scale(1, -1);
  ctx.drawImage(videoEl, 0, 0, qw, qh, 0, 0, qw, qh);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(qw, qh, qw, qh);
  ctx.clip();
  ctx.translate(qw * 2, qh * 2);
  ctx.scale(-1, -1);
  ctx.drawImage(videoEl, 0, 0, qw, qh, 0, 0, qw, qh);
  ctx.restore();
}

function clipWedge(ctx, r) {
  const a0 = -Math.PI / 6;
  const a1 = Math.PI / 6;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  ctx.closePath();
  ctx.clip();
}

function renderKaleidoscope(ctx, videoEl, dt) {
  kalaAngle += 0.003 * (dt || 0);

  const r = Math.hypot(640, 360);

  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.translate(640, 360);
    ctx.rotate(kalaAngle + (Math.PI / 3) * i);

    clipWedge(ctx, r);

    ctx.drawImage(videoEl, -640, -360, 1280, 720);

    ctx.restore();
  }
}

function render(ctx, videoEl, dt) {
  if (!videoEl) return;

  try {
    ctx.drawImage(videoEl, 0, 0, 1280, 720);
  } catch {
    return;
  }

  if (mode === MODE_HORIZONTAL) {
    renderHorizontal(ctx, videoEl);
  } else if (mode === MODE_QUAD) {
    renderQuad(ctx, videoEl);
  } else {
    renderKaleidoscope(ctx, videoEl, dt);
  }
}

function destroy() {
  kalaAngle = 0;
}

export default {
  name,
  init,
  render,
  destroy,
  setMirrorMode,
  MODE_HORIZONTAL,
  MODE_QUAD,
  MODE_KALEIDOSCOPE,
};
