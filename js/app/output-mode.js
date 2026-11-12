/* ============================================================
   APP · modo salida (ventana de proyección)
   Se ejecuta en la ventana "vjout": recibe estados por postMessage y renderiza a pantalla completa.
   Usa:      engine/*, clips
   Aporta:   initOutput()
   ============================================================ */
'use strict';

/* =========================================================
   MODO SALIDA
   ========================================================= */
function initOutput() {
  document.body.classList.add('output-mode');
  document.body.innerHTML = '<div id="view"></div>';
  document.body.style.background = '#000';
  document.body.style.cursor = 'default';

  const core = buildCore(document.getElementById('view'));
  const outQ = initOutputQuality(core);
  window.vjOutCore = core;                       // (útil para depurar)
  installStaticClips(core);
  setActive(core.layerA, 'monolith');
  setActive(core.layerB, 'fondo');

  let outState = null;
  let outAudio = 0, outMotion = 0, outAuto = null, outRates = null;
  let outLastT = performance.now();
  let lastFrameSend = 0;
  let transition = { active: false, start: 0, duration: 600, from: null, to: null };

  function tryApply() {
    ['A','B'].forEach(name => {
      const layer = name === 'A' ? core.layerA : core.layerB;
      const key = outState.active[name];
      if (!key) return;
      if (!layer.clips[key]) {
        const def = CLIP_DEFS[key];
        if (def && def.head && !core.headReady) return;
        installClip(core, layer, key);
      }
    });
    ['A','B'].forEach(name => {
      const layer = name === 'A' ? core.layerA : core.layerB;
      const key = outState.active[name];
      if (layer.clips[key] && key !== layer.active) {
        if (layer.active) layer.prevActive = layer.active;
        layer.active = key;
        layer.transition = { start: performance.now(),
                             dur: (outState.clipCrossfadeMs || 600) };
      }
    });
    core.camera.position.fromArray(outState.cam.pos);
    core.camera.lookAt(new THREE.Vector3().fromArray(outState.cam.target));
  }

  loadHead(core, () => { if (outState) tryApply(); });

  function handleTake(d) {
    let from;
    if (transition.active) {
      const t = easeInOut(Math.min(1, (performance.now() - transition.start) / transition.duration));
      from = lerpStates(transition.from, transition.to, t);
    } else if (outState) {
      from = flattenSnapshot(outState);
    } else {
      from = flattenSnapshot(d);
    }

    const instant = !!d.instantParams;
    outState = d;

    if (!instant) {
      transition.active = true;
      transition.start = performance.now();
      transition.duration = d.clipCrossfadeMs || state.transitionDur || 600;
      transition.from = from;
      transition.to = flattenSnapshot(d);
    } else {
      transition.active = false;
    }

    tryApply();
  }

  window.addEventListener('message', e => {
    const d = e.data; if (!d) return;
    if (d.type === 'state') {
      handleTake(d);
    } else if (d.type === 'live') {
      outAudio = d.audio || 0;
      outMotion = d.motion || 0;
      if (typeof d.timeA === 'number') {
        // corrección suave (un salto brusco se vería como tirón); si la diferencia es grande, se iguala
        const soft = (cur, tgt) => Math.abs(tgt - cur) > 1 ? tgt : cur + (tgt - cur) * 0.25;
        core.layerA.time = soft(core.layerA.time, d.timeA); core.layerB.time = soft(core.layerB.time, d.timeB);
        core.layerA.root.rotation.y = soft(core.layerA.root.rotation.y, d.rotA);
        core.layerB.root.rotation.y = soft(core.layerB.root.rotation.y, d.rotB);
        core.layerA.root.rotation.x = soft(core.layerA.root.rotation.x, d.rotXA || 0);
        core.layerB.root.rotation.x = soft(core.layerB.root.rotation.x, d.rotXB || 0);
        core.layerA.root.rotation.z = soft(core.layerA.root.rotation.z, d.rotZA || 0);
        core.layerB.root.rotation.z = soft(core.layerB.root.rotation.z, d.rotZB || 0);
        if (d.rates) outRates = d.rates;
      }
      outAuto = d.auto || null;
    }
  });

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = 192; frameCanvas.height = 108;
  const frameCtx = frameCanvas.getContext('2d');
  function sendFrame() {
    if (!window.opener || !core.renderer) return;
    try {
      frameCtx.drawImage(core.renderer.domElement, 0, 0, 192, 108);
      window.opener.postMessage({ type: 'frame', url: frameCanvas.toDataURL('image/jpeg', 0.5),
                                  fps: Math.round(outQ.fps), scale: core.scale }, '*');
    } catch (err) {}
  }

  function outLoop(now) {
    requestAnimationFrame(outLoop);
    outQ.tick(now);
    const dtMs = Math.min(now - outLastT, 60); outLastT = now;
    const dt = dtMs / 16.6667;

    if (outState) {
      let eff;
      if (transition.active) {
        const t = Math.min(1, (now - transition.start) / transition.duration);
        if (t >= 1) { transition.active = false; }
        eff = lerpStates(transition.from, transition.to, easeInOut(t));
      } else {
        eff = {
          colPrimary: outState.params.colPrimary, colAccent: outState.params.colAccent, colModel: outState.params.colModel,
          opacity: outState.params.opacity, deform: outState.params.deform,
          scale: outState.params.scale, speed: outState.params.speed,
          rotSpeed: outState.params.rotSpeed, rotX: outState.params.rotX, rotZ: outState.params.rotZ,
          talking: outState.params.talking,
          pulsing: outState.params.pulsing, textured: outState.params.textured, effects: outState.effects,
          crossfade: outState.crossfade, blend: outState.blend, opA: outState.opA,
          opB: outState.opB, bpm: outState.bpm, audioGain: outState.audioGain,
          videoGain: outState.videoGain, autoRotate: outState.autoRotate
        };
      }

      if (outAuto) {
        eff.crossfade = outAuto.crossfade;
        eff.deform = outAuto.deform;
        eff.effects = outAuto.effects;
      }

      eff._audio = outAudio; eff._motion = outMotion;

      // velocidades en vivo de la consola (para que girar/parar se note al instante en la salida)
      if (outRates) {
        eff.speed = outRates.speed; eff.rotSpeed = outRates.rotSpeed; eff.rotX = outRates.rotX; eff.rotZ = outRates.rotZ;
        eff.bpm = outRates.bpm; eff.autoRotate = outRates.autoRotate;
      }

      const rate = eff.bpm / 120;
      core.layerA.time += 0.05 * eff.speed.A * rate * dt;
      core.layerB.time += 0.05 * eff.speed.B * rate * dt;
      if (eff.autoRotate) {
        core.layerA.root.rotation.y += eff.rotSpeed.A * dt * 0.5;
        core.layerB.root.rotation.y += eff.rotSpeed.B * dt * 0.5;
      core.layerA.root.rotation.x += eff.rotX.A * dt * 0.5;
      core.layerB.root.rotation.x += eff.rotX.B * dt * 0.5;
      core.layerA.root.rotation.z += eff.rotZ.A * dt * 0.5;
      core.layerB.root.rotation.z += eff.rotZ.B * dt * 0.5;
      }

      renderFrame(core, eff, dt, now);
    }

    if (now - lastFrameSend > 400) { sendFrame(); lastFrameSend = now; }
  }
  requestAnimationFrame(outLoop);
  window.addEventListener('resize', () => onResize(core));

  document.body.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  });

  initOutputMedia(core);
  initOutputMapping(core);

  if (window.opener) window.opener.postMessage({ type: 'ready' }, '*');
}
