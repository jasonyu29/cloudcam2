const name = "drawing";

const MODE_GLOW = "MODE_GLOW";
const MODE_SPARKLE = "MODE_SPARKLE";
const MODE_HEARTBEAT = "MODE_HEARTBEAT";

let canvasRef = null;
let strokes = [];
let pointerStrokes = new Map();
let pointerDownMeta = new Map();

let color = "#00d1ff";
let width = 4;
let mode = MODE_GLOW;

let sparkleParticles = [];
let emojiParticles = [];

const emojis = ["❤", "✨", "🔥", "💫", "🌊"];

let listenersAttached = false;
let onPointerDown = null;
let onPointerMove = null;
let onPointerUp = null;
let onPointerCancel = null;

function nowMs() {
  return performance.now();
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function canvasPointFromEvent(ev) {
  const rect = canvasRef.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) * canvasRef.width) / rect.width;
  const y = ((ev.clientY - rect.top) * canvasRef.height) / rect.height;
  return { x, y };
}

function spawnSparkles(p0, p1) {
  const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const t0 = nowMs();
  for (let i = 0; i < 3; i++) {
    sparkleParticles.push({
      x: mid.x + rand(-6, 6),
      y: mid.y + rand(-6, 6),
      createdAt: t0,
    });
  }
}

function spawnEmojiBurst(p) {
  const t0 = nowMs();
  for (let i = 0; i < 6; i++) {
    const rise = rand(80, 100);
    emojiParticles.push({
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x0: p.x,
      y0: p.y,
      dx: rand(-18, 18),
      rise,
      createdAt: t0,
      duration: 1200,
    });
  }
}

function setupPointerListeners(canvas) {
  if (listenersAttached) return;

  canvas.style.touchAction = "none";

  onPointerDown = (ev) => {
    if (!canvasRef) return;

    const p = canvasPointFromEvent(ev);
    const t0 = nowMs();

    const stroke = {
      points: [p],
      color,
      width,
      createdAt: t0,
      opacity: 1,
    };

    pointerStrokes.set(ev.pointerId, stroke);
    pointerDownMeta.set(ev.pointerId, { p0: p, t0 });

    try {
      canvasRef.setPointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  onPointerMove = (ev) => {
    const stroke = pointerStrokes.get(ev.pointerId);
    if (!stroke) return;

    const p = canvasPointFromEvent(ev);
    const last = stroke.points[stroke.points.length - 1];

    if (!last || dist(p, last) <= 3) return;

    stroke.points.push(p);

    if (mode === MODE_SPARKLE) {
      spawnSparkles(last, p);
    }
  };

  onPointerUp = (ev) => {
    const stroke = pointerStrokes.get(ev.pointerId);
    if (!stroke) return;

    const meta = pointerDownMeta.get(ev.pointerId);
    const t1 = nowMs();
    const last = stroke.points[stroke.points.length - 1] || (meta ? meta.p0 : null);

    strokes.push(stroke);

    if (meta && last) {
      const travel = dist(meta.p0, last);
      const dt = t1 - meta.t0;
      if (travel < 8 && dt < 200) {
        spawnEmojiBurst(last);
      }
    }

    pointerStrokes.delete(ev.pointerId);
    pointerDownMeta.delete(ev.pointerId);

    try {
      canvasRef.releasePointerCapture(ev.pointerId);
    } catch {
      // ignore
    }
  };

  onPointerCancel = (ev) => {
    pointerStrokes.delete(ev.pointerId);
    pointerDownMeta.delete(ev.pointerId);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);

  listenersAttached = true;
}

function drawStrokePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawHeartbeatPath(ctx, points) {
  const step = 80;
  let remainingToNext = step;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 0.001) continue;

    const ux = dx / segLen;
    const uy = dy / segLen;
    const px = -uy;
    const py = ux;

    let traveled = 0;

    while (traveled + remainingToNext <= segLen) {
      const s = traveled + remainingToNext;
      const baseX = a.x + ux * s;
      const baseY = a.y + uy * s;

      ctx.lineTo(baseX, baseY);
      ctx.lineTo(baseX + px * 30, baseY + py * 30);
      ctx.lineTo(baseX - px * 15, baseY - py * 15);
      ctx.lineTo(baseX + px * 8, baseY + py * 8);
      ctx.lineTo(baseX, baseY);

      traveled = s;
      remainingToNext = step;
    }

    ctx.lineTo(b.x, b.y);

    remainingToNext -= segLen - traveled;
    if (remainingToNext < 0.001) remainingToNext = step;
  }

  ctx.stroke();
}

function renderSparkles(ctx) {
  const t0 = nowMs();
  const lifetime = 500;

  const next = [];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const p of sparkleParticles) {
    const age = t0 - p.createdAt;
    if (age >= lifetime) continue;

    const a = 1 - age / lifetime;

    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const len = 6;

    ctx.beginPath();
    ctx.moveTo(p.x - len, p.y);
    ctx.lineTo(p.x + len, p.y);
    ctx.moveTo(p.x, p.y - len);
    ctx.lineTo(p.x, p.y + len);
    ctx.moveTo(p.x - len * 0.7, p.y - len * 0.7);
    ctx.lineTo(p.x + len * 0.7, p.y + len * 0.7);
    ctx.moveTo(p.x - len * 0.7, p.y + len * 0.7);
    ctx.lineTo(p.x + len * 0.7, p.y - len * 0.7);
    ctx.stroke();

    next.push(p);
  }

  ctx.restore();
  sparkleParticles = next;
}

function renderEmojis(ctx) {
  const t0 = nowMs();

  const next = [];

  ctx.save();
  ctx.font = "28px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const e of emojiParticles) {
    const age = t0 - e.createdAt;
    if (age >= e.duration) continue;

    const p = age / e.duration;
    const x = e.x0 + e.dx * p;
    const y = e.y0 - e.rise * p;

    let a = 1;
    if (age > e.duration - 300) {
      a = (e.duration - age) / 300;
    }

    ctx.globalAlpha = a;
    ctx.fillText(e.emoji, x, y);

    next.push(e);
  }

  ctx.restore();
  emojiParticles = next;
}

function render(ctx, _videoEl, _dt) {
  const t0 = nowMs();

  const nextStrokes = [];
  for (const s of strokes) {
    const age = t0 - s.createdAt;

    let o = 1;
    if (age <= 2000) {
      o = 1;
    } else if (age <= 3000) {
      o = 1 - (age - 2000) / 1000;
    } else {
      o = 0;
    }

    s.opacity = o;

    if (s.opacity > 0) nextStrokes.push(s);
  }
  strokes = nextStrokes;

  for (const s of strokes) {
    if (!s.points || s.points.length < 2) continue;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = s.color;

    ctx.globalAlpha = s.opacity * 0.25;
    ctx.lineWidth = s.width * 4;
    if (mode === MODE_HEARTBEAT) {
      drawHeartbeatPath(ctx, s.points);
    } else {
      drawStrokePath(ctx, s.points);
    }

    ctx.globalAlpha = s.opacity;
    ctx.lineWidth = s.width;
    if (mode === MODE_HEARTBEAT) {
      drawHeartbeatPath(ctx, s.points);
    } else {
      drawStrokePath(ctx, s.points);
    }

    ctx.restore();
  }

  if (mode === MODE_SPARKLE) {
    renderSparkles(ctx);
  }

  renderEmojis(ctx);

  for (const s of pointerStrokes.values()) {
    if (!s.points || s.points.length < 2) continue;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = s.color;

    ctx.globalAlpha = 0.25;
    ctx.lineWidth = s.width * 4;
    if (mode === MODE_HEARTBEAT) {
      drawHeartbeatPath(ctx, s.points);
    } else {
      drawStrokePath(ctx, s.points);
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = s.width;
    if (mode === MODE_HEARTBEAT) {
      drawHeartbeatPath(ctx, s.points);
    } else {
      drawStrokePath(ctx, s.points);
    }

    ctx.restore();
  }
}

function destroy() {
  if (canvasRef && listenersAttached) {
    canvasRef.removeEventListener("pointerdown", onPointerDown);
    canvasRef.removeEventListener("pointermove", onPointerMove);
    canvasRef.removeEventListener("pointerup", onPointerUp);
    canvasRef.removeEventListener("pointercancel", onPointerCancel);
  }

  listenersAttached = false;
  onPointerDown = null;
  onPointerMove = null;
  onPointerUp = null;
  onPointerCancel = null;

  canvasRef = null;
  strokes = [];
  pointerStrokes.clear();
  pointerDownMeta.clear();
  sparkleParticles = [];
  emojiParticles = [];
}

function setupDrawing() {
  if (!canvasRef) return;
  setupPointerListeners(canvasRef);
}

function clearDrawing() {
  strokes = [];
  pointerStrokes.clear();
  pointerDownMeta.clear();
  sparkleParticles = [];
  emojiParticles = [];
}

function setColor(hex) {
  if (typeof hex === "string" && hex.length > 0) color = hex;
}

function setWidth(px) {
  const v = Number(px);
  if (Number.isFinite(v) && v > 0) width = v;
}

function setMode(nextMode) {
  if (nextMode === MODE_GLOW || nextMode === MODE_SPARKLE || nextMode === MODE_HEARTBEAT) {
    mode = nextMode;
  }
}

function init(canvas, _analyser) {
  canvasRef = canvas;
  setupPointerListeners(canvasRef);
}

export default {
  name,
  init,
  render,
  destroy,
  setupDrawing,
  clearDrawing,
  setColor,
  setWidth,
  setMode,
  MODE_GLOW,
  MODE_SPARKLE,
  MODE_HEARTBEAT,
};
