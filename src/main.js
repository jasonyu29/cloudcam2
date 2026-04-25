import { getVideoStream, getAudioAnalyser } from "./capture.js";
import * as compositor from "./compositor.js";
import { effects } from "./effects/index.js";

document.addEventListener("DOMContentLoaded", async () => {
  const videoEl = await getVideoStream();

  let audio;
  try {
    audio = await getAudioAnalyser();
  } catch (err) {
    console.error("Audio analyser unavailable; continuing without audio.", err);
    audio = null;
  }

  compositor.init(videoEl, audio);
  compositor.start();

  window.app = {
    compositor,
    enableEffect: compositor.enableEffect,
    disableEffect: compositor.disableEffect,
    effects,
  };
});
