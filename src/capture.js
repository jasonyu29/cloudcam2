export async function getVideoStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    });

    let video = document.getElementById("webcam-source");

    if (!video) {
      video = document.createElement("video");
      video.id = "webcam-source";
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.position = "fixed";
      video.style.left = "-99999px";
      video.style.top = "0";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      document.body.appendChild(video);
    }

    video.srcObject = stream;

    await new Promise((resolve) => {
      if (video.readyState >= 2) return resolve();
      video.onloadedmetadata = () => resolve();
    });

    try {
      await video.play();
    } catch {
      // Ignore; autoplay might be blocked in some contexts.
    }

    return video;
  } catch (err) {
    if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
      console.error("Camera permission denied. Please allow camera access and try again.", err);
    } else {
      console.error("Failed to get camera stream.", err);
    }
    throw err;
  }
}

export async function getAudioAnalyser() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    return { analyser, dataArray };
  } catch (err) {
    if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
      console.error(
        "Microphone permission denied. Please allow microphone access and try again.",
        err,
      );
    } else {
      console.error("Failed to create audio analyser.", err);
    }
    throw err;
  }
}
