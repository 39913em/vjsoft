
'use strict';

function startMainLoop() {
  let lastT = performance.now();
  let prevNow = lastT;

  function loop(now) {
    requestAnimationFrame(loop);
    mainQ.tick(now);
    const dtMs = Math.min(now - lastT, 60); lastT = now;
    const dt = dtMs / 16.6667;

    if (state.audioOn) audioLevel = readAudio(); else audioLevel = 0;
    if (state.videoOn) motionLevel = readMotion(); else motionLevel = 0;

    const autoOn = updateAuto(Math.min(now - prevNow, 250));
    prevNow = now;

    const rate = state.bpm / 120;
    core.layerA.time += 0.05 * state.speed.A * rate * dt;
    core.layerB.time += 0.05 * state.speed.B * rate * dt;
    if (state.autoRotate) {
      core.layerA.root.rotation.y += state.rotSpeed.A * dt * 0.5;
      core.layerB.root.rotation.y += state.rotSpeed.B * dt * 0.5;
      core.layerA.root.rotation.x += state.rotX.A * dt * 0.5;
      core.layerB.root.rotation.x += state.rotX.B * dt * 0.5;
      core.layerA.root.rotation.z += state.rotZ.A * dt * 0.5;
      core.layerB.root.rotation.z += state.rotZ.B * dt * 0.5;
    }

    const eff = {
      colPrimary: state.colPrimary, colAccent: state.colAccent, colModel: state.colModel,
      opacity: state.opacity, deform: autoOn ? autoMod.deform : state.deform, scale: state.scale,
      speed: state.speed, rotSpeed: state.rotSpeed, rotX: state.rotX, rotZ: state.rotZ,
      talking: state.talking, pulsing: state.pulsing, textured: state.textured,
      effects: autoOn ? autoMod.effects : state.effects, crossfade: autoOn ? autoMod.crossfade : state.crossfade, blend: state.blend,
      opA: state.opA, opB: state.opB, bpm: state.bpm,
      audioGain: state.audioGain, videoGain: state.videoGain,
      autoRotate: state.autoRotate, _audio: audioLevel, _motion: motionLevel
    };

    renderFrame(core, eff, dt, now);
    controls.update();

    if (outputWin && !outputWin.closed && now - lastLiveSend > 100) {
      outputWin.postMessage({
        type: 'live',
        audio: audioLevel, motion: motionLevel,
        timeA: core.layerA.time, timeB: core.layerB.time,
        rotA: core.layerA.root.rotation.y, rotB: core.layerB.root.rotation.y,
        rotXA: core.layerA.root.rotation.x, rotXB: core.layerB.root.rotation.x,
        rotZA: core.layerA.root.rotation.z, rotZB: core.layerB.root.rotation.z,
        rates: { speed: state.speed, rotSpeed: state.rotSpeed, rotX: state.rotX, rotZ: state.rotZ,
                 bpm: state.bpm, autoRotate: state.autoRotate },
        auto: autoOn ? {
          crossfade: autoMod.crossfade,
          deform: { A: autoMod.deform.A, B: autoMod.deform.B },
          effects: autoMod.effects
        } : null
      }, '*');
      lastLiveSend = now;
    }
  }
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => onResize(core));
}
