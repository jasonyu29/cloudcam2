import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import './App.css';

type FilterPreset =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'cool'
  | 'dog'
  | 'cat'
  | 'shades'
  | 'rio';
type FacePoint = { x: number; y: number };
type PixelPoint = { x: number; y: number };

function getFaceGeometry(
  landmarks: FacePoint[],
  canvasWidth: number,
  canvasHeight: number
) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const noseTip = landmarks[1];
  const mouthTop = landmarks[13];

  if (!leftEye || !rightEye || !noseTip || !mouthTop) {
    return null;
  }

  const toPixels = (point: FacePoint): PixelPoint => ({
    x: point.x * canvasWidth,
    y: point.y * canvasHeight,
  });

  const leftEyePx = toPixels(leftEye);
  const rightEyePx = toPixels(rightEye);
  const noseTipPx = toPixels(noseTip);
  const mouthTopPx = toPixels(mouthTop);

  const dx = rightEyePx.x - leftEyePx.x;
  const dy = rightEyePx.y - leftEyePx.y;
  const eyeDistance = Math.hypot(dx, dy);
  if (eyeDistance < 1) {
    return null;
  }

  const faceCenter: PixelPoint = {
    x: (leftEyePx.x + rightEyePx.x) / 2,
    y: (leftEyePx.y + rightEyePx.y) / 2,
  };
  const ux = dx / eyeDistance;
  const uy = dy / eyeDistance;
  const px = -uy;
  const py = ux;

  return {
    leftEyePx,
    rightEyePx,
    noseTipPx,
    mouthTopPx,
    faceCenter,
    eyeDistance,
    ux,
    uy,
    px,
    py,
  };
}

function drawDogFaceOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FacePoint[],
  canvasWidth: number,
  canvasHeight: number
) {
  const geometry = getFaceGeometry(landmarks, canvasWidth, canvasHeight);
  if (!geometry) {
    return;
  }

  const {
    noseTipPx,
    mouthTopPx,
    faceCenter,
    eyeDistance,
    ux,
    uy,
    px,
    py,
  } = geometry;

  const earSpread = eyeDistance * 0.75;
  const earLift = eyeDistance * 1.05;
  const leftEar: PixelPoint = {
    x: faceCenter.x - ux * earSpread - px * earLift,
    y: faceCenter.y - uy * earSpread - py * earLift,
  };
  const rightEar: PixelPoint = {
    x: faceCenter.x + ux * earSpread - px * earLift,
    y: faceCenter.y + uy * earSpread - py * earLift,
  };

  const earWidth = Math.max(20, eyeDistance * 0.48);
  const earHeight = earWidth * 1.25;
  const muzzleRadius = Math.max(24, eyeDistance * 0.42);
  const noseRadius = Math.max(8, eyeDistance * 0.12);
  const tongueSize = Math.max(14, eyeDistance * 0.2);

  ctx.save();

  // Draw ears as filled triangles for a fuller "mask" look.
  const drawEar = (center: PixelPoint, direction: number) => {
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - earHeight * 0.55);
    ctx.lineTo(center.x - earWidth * direction, center.y + earHeight * 0.6);
    ctx.lineTo(center.x + earWidth * direction, center.y + earHeight * 0.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(116, 82, 62, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 42, 30, 0.95)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawEar(leftEar, 1);
  drawEar(rightEar, -1);

  // Muzzle.
  ctx.beginPath();
  ctx.arc(noseTipPx.x, noseTipPx.y + muzzleRadius * 0.45, muzzleRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(244, 226, 198, 0.65)';
  ctx.fill();

  // Nose.
  ctx.beginPath();
  ctx.arc(noseTipPx.x, noseTipPx.y, noseRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 20, 24, 0.95)';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${tongueSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.fillText('👅', mouthTopPx.x, mouthTopPx.y + tongueSize * 0.8);
  ctx.restore();
}

function drawCatFaceOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FacePoint[],
  canvasWidth: number,
  canvasHeight: number
) {
  const geometry = getFaceGeometry(landmarks, canvasWidth, canvasHeight);
  if (!geometry) {
    return;
  }

  const {
    noseTipPx,
    faceCenter,
    eyeDistance,
    ux,
    uy,
    px,
    py,
  } = geometry;

  const earSpread = eyeDistance * 0.65;
  const earLift = eyeDistance * 1.05;
  const leftEar: PixelPoint = {
    x: faceCenter.x - ux * earSpread - px * earLift,
    y: faceCenter.y - uy * earSpread - py * earLift,
  };
  const rightEar: PixelPoint = {
    x: faceCenter.x + ux * earSpread - px * earLift,
    y: faceCenter.y + uy * earSpread - py * earLift,
  };
  const earWidth = Math.max(18, eyeDistance * 0.35);
  const earHeight = earWidth * 1.5;

  ctx.save();
  const drawCatEar = (center: PixelPoint, direction: number) => {
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - earHeight * 0.6);
    ctx.lineTo(center.x - earWidth * direction, center.y + earHeight * 0.55);
    ctx.lineTo(center.x + earWidth * direction, center.y + earHeight * 0.55);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232, 138, 167, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 222, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  drawCatEar(leftEar, 1);
  drawCatEar(rightEar, -1);

  // Nose and whiskers.
  ctx.beginPath();
  ctx.arc(noseTipPx.x, noseTipPx.y, Math.max(6, eyeDistance * 0.08), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 170, 188, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  const whiskerLen = eyeDistance * 0.6;
  const whiskerOffset = eyeDistance * 0.18;
  for (const side of [-1, 1]) {
    const fromX = noseTipPx.x + side * whiskerOffset;
    const toX = noseTipPx.x + side * whiskerLen;
    ctx.beginPath();
    ctx.moveTo(fromX, noseTipPx.y - whiskerOffset * 0.35);
    ctx.lineTo(toX, noseTipPx.y - whiskerOffset * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fromX, noseTipPx.y + whiskerOffset * 0.15);
    ctx.lineTo(toX, noseTipPx.y + whiskerOffset * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShadesOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: FacePoint[],
  canvasWidth: number,
  canvasHeight: number
) {
  const geometry = getFaceGeometry(landmarks, canvasWidth, canvasHeight);
  if (!geometry) {
    return;
  }

  const { leftEyePx, rightEyePx, faceCenter, eyeDistance } = geometry;
  const lensSize = Math.max(22, eyeDistance * 0.48);
  const lensHeight = lensSize * 0.68;
  const bridgeWidth = Math.max(8, eyeDistance * 0.1);

  ctx.save();
  ctx.fillStyle = 'rgba(18, 22, 30, 0.78)';
  ctx.strokeStyle = 'rgba(168, 188, 230, 0.7)';
  ctx.lineWidth = 2;

  const drawLens = (center: PixelPoint) => {
    ctx.beginPath();
    ctx.roundRect(
      center.x - lensSize / 2,
      center.y - lensHeight / 2,
      lensSize,
      lensHeight,
      10
    );
    ctx.fill();
    ctx.stroke();
  };

  drawLens(leftEyePx);
  drawLens(rightEyePx);

  ctx.beginPath();
  ctx.moveTo(leftEyePx.x + lensSize / 2, faceCenter.y);
  ctx.lineTo(rightEyePx.x - lensSize / 2, faceCenter.y);
  ctx.lineWidth = bridgeWidth;
  ctx.strokeStyle = 'rgba(130, 148, 185, 0.78)';
  ctx.stroke();
  ctx.restore();
}

function drawTrackingDebugMarks(
  ctx: CanvasRenderingContext2D,
  landmarks: FacePoint[],
  canvasWidth: number,
  canvasHeight: number
) {
  const debugPoints = [33, 263, 1, 13, 10, 234, 454];

  ctx.save();
  for (const pointIndex of debugPoints) {
    const point = landmarks[pointIndex];
    if (!point) {
      continue;
    }

    const x = point.x * canvasWidth;
    const y = point.y * canvasHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff9d';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#001f12';
    ctx.stroke();
  }
  ctx.restore();
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTimeoutRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [faceModelStatus, setFaceModelStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [faceModelError, setFaceModelError] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [stretchX, setStretchX] = useState(100);
  const [stretchY, setStretchY] = useState(100);
  const [pixelation, setPixelation] = useState(1);
  const [showTrackingDebug, setShowTrackingDebug] = useState(true);
  const lastFaceStatusUpdateRef = useRef(0);
  const isTrackingFilter =
    filterPreset === 'dog' || filterPreset === 'cat' || filterPreset === 'shades';

  const stopCamera = () => {
    if (renderTimeoutRef.current !== null) {
      window.clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  };

  useEffect(() => {
    let cancelled = false;
    const initTimeoutMs = 15000;

    const initFaceLandmarker = async () => {
      setFaceModelStatus('loading');
      setFaceModelError('');

      let timeoutId: number | null = window.setTimeout(() => {
        if (!cancelled) {
          setFaceModelStatus('error');
          setFaceModelError(
            'Tracker load timed out. Check internet connection or extension/ad-blocker settings.'
          );
        }
      }, initTimeoutMs);

      try {
        const wasmSources = [
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
          'https://unpkg.com/@mediapipe/tasks-vision@latest/wasm',
        ];

        let initialized = false;
        let lastError: unknown = null;

        for (const wasmSource of wasmSources) {
          try {
            const vision = await FilesetResolver.forVisionTasks(wasmSource);
            if (cancelled) {
              return;
            }

            const landmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              },
              runningMode: 'VIDEO',
              numFaces: 1,
            });

            if (cancelled) {
              landmarker.close();
              return;
            }

            faceLandmarkerRef.current = landmarker;
            initialized = true;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!initialized) {
          throw lastError ?? new Error('Unable to initialize tracker runtime.');
        }

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        setFaceModelStatus('ready');
        setFaceModelError('');
      } catch (error) {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!cancelled) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : 'Unknown tracker initialization error.';
          setFaceModelStatus('error');
          setFaceModelError(
            `Face tracker failed to load: ${message}`
          );
        }
      }
    };

    void initFaceLandmarker();

    return () => {
      cancelled = true;
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Your browser does not support webcam access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
    } catch {
      setErrorMessage(
        'Unable to access the webcam. Check browser permissions and make sure no other app is using the camera.'
      );
      setIsCameraOn(false);
    }
  };

  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const presetFilterMap: Record<FilterPreset, string> = {
    none: 'none',
    grayscale: 'grayscale(1)',
    sepia: 'sepia(1)',
    vintage: 'sepia(0.7) contrast(1.15) saturate(0.8)',
    cool: 'hue-rotate(20deg) contrast(1.05)',
    dog: 'sepia(0.2) contrast(1.08) saturate(1.12)',
    cat: 'contrast(1.08) saturate(1.2) hue-rotate(-5deg)',
    shades: 'contrast(1.12) saturate(0.95)',
    rio: 'contrast(1.18) saturate(1.28) hue-rotate(-8deg) brightness(1.06)',
  };

  const manualFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const computedFilter =
    filterPreset === 'none'
      ? manualFilter
      : `${presetFilterMap[filterPreset]} ${manualFilter}`;

  useEffect(() => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl || !isCameraOn) {
      return;
    }

    const offscreen = offscreenCanvasRef.current ?? document.createElement('canvas');
    offscreenCanvasRef.current = offscreen;
    const offscreenCtx = offscreen.getContext('2d');
    const ctx = canvasEl.getContext('2d');
    if (!offscreenCtx || !ctx) {
      return;
    }

    const drawFrame = () => {
      const sourceWidth = videoEl.videoWidth;
      const sourceHeight = videoEl.videoHeight;
      if (!sourceWidth || !sourceHeight) {
        renderTimeoutRef.current = window.setTimeout(drawFrame, 33);
        return;
      }

      const downscaleFactor = Math.max(1, pixelation);
      const lowWidth = Math.max(1, Math.floor(sourceWidth / downscaleFactor));
      const lowHeight = Math.max(1, Math.floor(sourceHeight / downscaleFactor));

      offscreen.width = lowWidth;
      offscreen.height = lowHeight;
      offscreenCtx.imageSmoothingEnabled = false;
      offscreenCtx.drawImage(videoEl, 0, 0, lowWidth, lowHeight);

      canvasEl.width = sourceWidth;
      canvasEl.height = sourceHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, sourceWidth, sourceHeight);
      ctx.drawImage(offscreen, 0, 0, sourceWidth, sourceHeight);

      if (isTrackingFilter && faceLandmarkerRef.current) {
        const landmarksResult = faceLandmarkerRef.current.detectForVideo(
          videoEl,
          performance.now()
        );
        const facePoints = landmarksResult.faceLandmarks?.[0] as FacePoint[] | undefined;
        const hasFace = Boolean(facePoints && facePoints.length > 0);
        const now = performance.now();
        if (now - lastFaceStatusUpdateRef.current > 250) {
          setFaceDetected(hasFace);
          lastFaceStatusUpdateRef.current = now;
        }

        if (facePoints && facePoints.length > 0) {
          if (filterPreset === 'dog') {
            drawDogFaceOverlay(ctx, facePoints, sourceWidth, sourceHeight);
          } else if (filterPreset === 'cat') {
            drawCatFaceOverlay(ctx, facePoints, sourceWidth, sourceHeight);
          } else if (filterPreset === 'shades') {
            drawShadesOverlay(ctx, facePoints, sourceWidth, sourceHeight);
          }

          if (showTrackingDebug) {
            drawTrackingDebugMarks(ctx, facePoints, sourceWidth, sourceHeight);
          }
        }
      } else if (!isTrackingFilter && faceDetected) {
        setFaceDetected(false);
      }

      if (filterPreset === 'rio') {
        ctx.save();
        // Add a subtle cool cast near the top of the frame.
        const topGradient = ctx.createLinearGradient(0, 0, 0, sourceHeight * 0.45);
        topGradient.addColorStop(0, 'rgba(86, 152, 226, 0.22)');
        topGradient.addColorStop(1, 'rgba(86, 152, 226, 0)');
        ctx.fillStyle = topGradient;
        ctx.fillRect(0, 0, sourceWidth, sourceHeight * 0.45);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = `300 ${Math.max(18, sourceWidth * 0.04)}px "Avenir Next", "Helvetica Neue", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIO DE JANEIRO', sourceWidth / 2, sourceHeight / 2);
        ctx.restore();
      }

      renderTimeoutRef.current = window.setTimeout(drawFrame, 33);
    };

    drawFrame();

    return () => {
      if (renderTimeoutRef.current !== null) {
        window.clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
    };
  }, [isCameraOn, pixelation, filterPreset, showTrackingDebug, isTrackingFilter, faceDetected]);

  return (
    <div className="app">
      <main className="main-content">
        <h1>Webcam Live Preview</h1>
        <p className="subtitle">Allow camera access to display your webcam feed.</p>

        <div className="controls top-controls">
          <button type="button" onClick={() => void startCamera()} disabled={isCameraOn}>
            Start Camera
          </button>
          <button type="button" onClick={stopCamera} disabled={!isCameraOn}>
            Stop Camera
          </button>
        </div>

        <div className="webcam-layout">
          <div className="webcam-card">
            <div className="preview-shell">
              <video
                ref={videoRef}
                className="source-video"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="webcam-video"
                style={{
                  filter: computedFilter,
                  transform: `scaleX(${stretchX / 100}) scaleY(${stretchY / 100})`,
                }}
              />
            </div>
            {!isCameraOn && !errorMessage && (
              <p className="status-message">Starting camera...</p>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>

          <div className="filter-panel">
            <h2>Filters</h2>
            <div className="filter-row">
              <label htmlFor="filter-preset">Preset</label>
              <select
                id="filter-preset"
                value={filterPreset}
                onChange={(event) => setFilterPreset(event.target.value as FilterPreset)}
              >
                <option value="none">None</option>
                <option value="grayscale">Grayscale</option>
                <option value="sepia">Sepia</option>
                <option value="vintage">Vintage</option>
                <option value="cool">Cool</option>
                <option value="dog">Dog Mask (tracked)</option>
                <option value="cat">Cat (tracked)</option>
                <option value="shades">Shades (tracked)</option>
                <option value="rio">Rio de Janeiro</option>
              </select>
              {isTrackingFilter && (
                <small>
                  {faceModelStatus === 'loading' || faceModelStatus === 'idle'
                    ? 'Loading face tracker...'
                    : faceDetected
                      ? 'Face detected: tracking is active.'
                      : 'Tracker loaded, but no face detected yet.'}
                </small>
              )}
              {faceModelError && <small>{faceModelError}</small>}
              {isTrackingFilter && (
                <label>
                  <input
                    type="checkbox"
                    checked={showTrackingDebug}
                    onChange={(event) => setShowTrackingDebug(event.target.checked)}
                  />{' '}
                  Show tracking marks
                </label>
              )}
              {filterPreset === 'dog' && (
                <small>
                  To make a full dog-face effect, replace the primitive shapes with transparent PNG/SVG layers
                  and anchor each one to landmark groups (ears/eyes/snout/jaw), then smooth with time-based
                  interpolation.
                </small>
              )}
            </div>

            <div className="filter-row">
              <label htmlFor="brightness">Brightness ({brightness}%)</label>
              <input
                id="brightness"
                type="range"
                min={50}
                max={150}
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </div>

            <div className="filter-row">
              <label htmlFor="contrast">Contrast ({contrast}%)</label>
              <input
                id="contrast"
                type="range"
                min={50}
                max={150}
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
              />
            </div>

            <div className="filter-row">
              <label htmlFor="saturation">Saturation ({saturation}%)</label>
              <input
                id="saturation"
                type="range"
                min={0}
                max={200}
                value={saturation}
                onChange={(event) => setSaturation(Number(event.target.value))}
              />
            </div>

            <div className="filter-row">
              <label htmlFor="stretch-x">Stretch X ({stretchX}%)</label>
              <input
                id="stretch-x"
                type="range"
                min={30}
                max={260}
                value={stretchX}
                onChange={(event) => setStretchX(Number(event.target.value))}
              />
            </div>

            <div className="filter-row">
              <label htmlFor="stretch-y">Stretch Y ({stretchY}%)</label>
              <input
                id="stretch-y"
                type="range"
                min={30}
                max={260}
                value={stretchY}
                onChange={(event) => setStretchY(Number(event.target.value))}
              />
            </div>

            <div className="filter-row">
              <label htmlFor="pixelation">Pixelation ({pixelation}x)</label>
              <input
                id="pixelation"
                type="range"
                min={1}
                max={20}
                value={pixelation}
                onChange={(event) => setPixelation(Number(event.target.value))}
              />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
