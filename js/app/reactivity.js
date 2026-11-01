
'use strict';

let audioCtx = null, analyser = null, audioData = null, audioLevel = 0;
let camVideo = null, camCanvas = null, camCtx = null, camPrev = null, motionLevel = 0;
let lastMotionRead = 0;

async function startAudio() {
  if (audioCtx) { await audioCtx.resume(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 512;
    src.connect(analyser);
    audioData = new Uint8Array(analyser.frequencyBinCount);
  } catch (err) {
    alert('No se pudo acceder al micrófono. Usa HTTPS o localhost.');
    state.audioOn = false; document.getElementById('btn-mic').classList.remove('on');
  }
}
function readAudio() {
  if (!analyser) return 0;
  analyser.getByteFrequencyData(audioData);
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) sum += audioData[i];
  return (sum / audioData.length) / 255;
}
async function startCamera() {
  if (camVideo) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    camVideo = document.createElement('video');
    camVideo.srcObject = stream; camVideo.playsInline = true; camVideo.muted = true;
    await camVideo.play();
    camCanvas = document.createElement('canvas'); camCanvas.width = 64; camCanvas.height = 48;
    camCtx = camCanvas.getContext('2d', { willReadFrequently: true });
  } catch (err) {
    alert('No se pudo acceder a la cámara. Usa HTTPS o localhost.');
    state.videoOn = false; document.getElementById('btn-cam').classList.remove('on');
  }
}
function readMotion() {
  const now = performance.now();
  if (now - lastMotionRead < 66) return motionLevel;
  lastMotionRead = now;
  if (!camVideo || camVideo.readyState < 2) return 0;
  camCtx.drawImage(camVideo, 0, 0, 64, 48);
  const data = camCtx.getImageData(0, 0, 64, 48).data;
  if (!camPrev) { camPrev = new Uint8ClampedArray(data); return 0; }
  let diff = 0;
  for (let i = 0; i < data.length; i += 4) diff += Math.abs(data[i] - camPrev[i]);
  camPrev.set(data);
  return Math.min(1, diff / (64*48*255) * 8);
}

function initReactivity() {
  document.getElementById('btn-mic').addEventListener('click', async e => {
    state.audioOn = !state.audioOn;
    if (state.audioOn) await startAudio();
    e.target.classList.toggle('on', state.audioOn);
  });
  document.getElementById('btn-cam').addEventListener('click', async e => {
    state.videoOn = !state.videoOn;
    if (state.videoOn) await startCamera();
    e.target.classList.toggle('on', state.videoOn);
  });
}
