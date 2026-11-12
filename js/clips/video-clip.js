/* ============================================================
   CLIPS · reproductor de vídeo
   Convierte cada archivo de clips/videos/ en un clip más del deck.
   Usa:      VIDEO_FILES (clips/videos/videos.js), CLIP_DEFS, THREE
   Aporta:   buildVideoClip()
   ============================================================ */
'use strict';

/* Un clip de vídeo es un plano con VideoTexture dentro de la capa, así que recibe
   exactamente lo mismo que cualquier otro clip:
     - Velocidad + BPM  → velocidad de reproducción (playbackRate)
     - Opacidad malla   → opacidad del vídeo
     - Escala           → tamaño (la escala de capa)
     - Pulsar           → latido suave de tamaño
     - Efectos, mezcla, crossfader, Auto VJ y salida → como siempre
   Solo reproduce mientras está visible; fuera de pantalla se pausa. */
function buildVideoClip(src, mats) {
  const group = new THREE.Group();

  // WebGL no puede leer vídeo de file:// (el navegador lo bloquea). Necesita http://localhost.
  if (location.protocol === 'file:' && src.indexOf('blob:') !== 0) {
    console.warn('[VJ] Los clips de vídeo necesitan servidor local (http://localhost). Mira el README.');
    return { group, update() {} };
  }

  const video = document.createElement('video');
  video.src = src;
  video.loop = true; video.muted = true; video.playsInline = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'metadata';

  const tex = new THREE.VideoTexture(video);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const planeMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(22, 12.375), planeMat);
  mesh.position.z = -0.5;
  group.add(mesh);

  // Ajusta el plano a la proporción real del vídeo (la altura se mantiene)
  let fitX = 1;
  video.addEventListener('loadedmetadata', () => {
    if (video.videoWidth && video.videoHeight) fitX = (video.videoWidth / video.videoHeight) / (22 / 12.375);
  });

  // Reproduce solo mientras se está dibujando
  let lastSeen = 0, frozen = false;
  mesh.onBeforeRender = () => {
    lastSeen = performance.now();
    if (!frozen && video.paused) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
  };
  setInterval(() => {
    if (!video.paused && performance.now() - lastSeen > 1500) video.pause();
  }, 500);

  let lastTime = null, lastUpd = 0, rateSm = 1;
  return { group, update(t, dt, p) {
    const now = performance.now();
    planeMat.opacity = mats.primary.opacity;

    // t avanza 0.05 · velocidad · (bpm/120) por frame → de ahí sale la velocidad del vídeo
    if (lastTime !== null && now - lastUpd < 1000 && dt > 0) {
      const rate = Math.max(0, (t - lastTime) / (dt * 0.05));
      const k = 1 - Math.pow(0.9, Math.min(dt, 3.6));   // suavizado independiente de los fps
      rateSm = rate < 0.02 ? 0 : rateSm + (rate - rateSm) * k;
    }
    lastTime = t; lastUpd = now;

    if (rateSm < 0.06) { frozen = true; if (!video.paused) video.pause(); }
    else {
      frozen = false;
      const target = Math.max(0.0625, Math.min(16, rateSm));
      if (Math.abs(video.playbackRate - target) > 0.02) { try { video.playbackRate = target; } catch (e) {} }
    }

    const s = p.pulsing ? 1 + Math.sin(t * 3) * 0.05 : 1;
    mesh.scale.set(fitX * s, s, 1);
  }};
}

/* Registro automático: un clip por cada archivo listado en VIDEO_FILES */
VIDEO_FILES.forEach((file, i) => {
  const name = file.replace(/\.[^.]+$/, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const src = 'clips/videos/' + encodeURI(file);
  CLIP_DEFS['video:' + file] = {
    label: name, tag: 'Video', head: false, build: mats => buildVideoClip(src, mats), seed: 2000 + i
  };
});
