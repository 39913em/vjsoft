/* ============================================================
   ENGINE · render por frame
   Pasada por capa con FX y transición, y composición final A/B.
   Usa:      core.js, layers.js, materials.js
   Aporta:   renderFrame(), renderLayerWithFX(), blendIndex(), clamp01()
   ============================================================ */
'use strict';

function blendIndex(name) {
  return { normal: 0, screen: 1, lighten: 2, overlay: 3, difference: 4, exclusion: 5 }[name] || 0;
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function renderLayerWithFX(core, layer, which, eff, now) {
  const camera = core.camera;
  const rtCur = which === 'A' ? core.rtA : core.rtB;
  const rtPrev = which === 'A' ? core.rtPrevA : core.rtPrevB;
  const rtTemp = which === 'A' ? core.rtTempA : core.rtTempB;
  const fxBuf = which === 'A' ? core.fxBufA : core.fxBufB;
  let fxFeed = which === 'A' ? core.fxFeedA : core.fxFeedB;
  const fxU = which === 'A' ? core.fxUA : core.fxUB;
  const fxScene = which === 'A' ? core.fxSceneA : core.fxSceneB;

  Object.keys(layer.clips).forEach(k => { layer.clips[k].group.visible = (k === layer.active); });

  core.renderer.setRenderTarget(rtCur);
  core.renderer.render(layer.scene, camera);

  let sourceRT = rtCur;

  if (layer.prevActive && layer.transition.dur > 0) {
    const tt = clamp01((now - layer.transition.start) / layer.transition.dur);
    if (tt < 1) {
      Object.keys(layer.clips).forEach(k => { layer.clips[k].group.visible = (k === layer.prevActive); });
      core.renderer.setRenderTarget(rtPrev);
      core.renderer.render(layer.scene, camera);
      Object.keys(layer.clips).forEach(k => { layer.clips[k].group.visible = (k === layer.active); });

      core.lerpU.uFrom.value = rtPrev.texture;
      core.lerpU.uTo.value = rtCur.texture;
      core.lerpU.uT.value = tt;
      core.renderer.setRenderTarget(rtTemp);
      core.renderer.render(core.lerpScene, core.orthoCam);
      sourceRT = rtTemp;
    } else {
      layer.prevActive = null;
    }
  }

  const e = eff.effects;
  const d = which === 'A' ? 'A' : 'B';
  fxU.uSource.value = sourceRT.texture;
  fxU.uPrev.value = fxFeed.texture;
  fxU.uTime.value = now * 0.001;
  fxU.uResolution.value.set(core.W, core.H);
  fxU.uRepetition.value = clamp01(e.repetition[d] + eff._motion * eff.videoGain * 0.2);
  fxU.uTunnel.value     = clamp01(e.tunnel[d] + eff._motion * eff.videoGain * 0.3 + eff._audio * eff.audioGain * 0.15);
  fxU.uGlitch.value     = clamp01(e.glitch[d] + eff._motion * eff.videoGain * 0.4 + eff._audio * eff.audioGain * 0.3);
  fxU.uAberration.value = clamp01(e.aberration[d] + eff._motion * eff.videoGain * 0.2 + eff._audio * eff.audioGain * 0.2);
  fxU.uBorders.value    = clamp01(e.borders[d]);
  fxU.uFluids.value     = clamp01(e.fluids[d]);
  fxU.uFractal.value    = clamp01(e.fractal[d] + eff._audio * eff.audioGain * 0.2);
  fxU.uPixelate.value   = clamp01(e.pixelate[d]);
  fxU.uMirror.value     = clamp01(e.mirror[d]);
  fxU.uZoom.value       = clamp01(e.zoom[d] + eff._audio * eff.audioGain * 0.3);
  fxU.uPosterize.value  = clamp01(e.posterize[d]);
  fxU.uScan.value       = clamp01(e.scan[d]);
  fxU.uInvert.value     = clamp01(e.invert[d]);
  fxU.uVignette.value   = clamp01(e.vignette[d]);
  fxU.uGrain.value      = clamp01(e.grain[d] + eff._audio * eff.audioGain * 0.15);

  // Con todos los efectos a 0 el shader es la identidad: se salta la pasada y se usa la imagen tal cual
  const anyFx = window.VJ_FORCE_FX || [fxU.uRepetition, fxU.uTunnel, fxU.uGlitch, fxU.uAberration, fxU.uBorders,
    fxU.uFluids, fxU.uFractal, fxU.uPixelate, fxU.uMirror, fxU.uZoom, fxU.uPosterize, fxU.uScan,
    fxU.uInvert, fxU.uVignette, fxU.uGrain].some(u => u.value > 0.001);
  if (anyFx) {
    if (!layer.fxWas) fxU.uPrev.value = sourceRT.texture;   // evita mezclar con un cuadro viejo al encender
    core.renderer.setRenderTarget(fxBuf);
    core.renderer.render(fxScene, core.orthoCam);

    if (which === 'A') { const t = core.fxFeedA; core.fxFeedA = core.fxBufA; core.fxBufA = t; }
    else               { const t = core.fxFeedB; core.fxFeedB = core.fxBufB; core.fxBufB = t; }
    layer.outRT = which === 'A' ? core.fxBufA : core.fxBufB;
  } else {
    layer.outRT = sourceRT;
  }
  layer.fxWas = anyFx;
}

function renderFrame(core, eff, dt, now) {
  applyMatsToLayer(core.matsA, { colPrimary: eff.colPrimary.A, colAccent: eff.colAccent.A, opacity: eff.opacity.A });
  applyMatsToLayer(core.matsB, { colPrimary: eff.colPrimary.B, colAccent: eff.colAccent.B, opacity: eff.opacity.B });

  // Una capa que no se ve (crossfader al extremo u opacidad 0) no se actualiza ni se dibuja
  const showA = eff.crossfade < 0.999 && eff.opA > 0.001;
  const showB = eff.crossfade > 0.001 && eff.opB > 0.001;
  const clipA = showA && core.layerA.active ? core.layerA.clips[core.layerA.active] : null;
  const clipB = showB && core.layerB.active ? core.layerB.clips[core.layerB.active] : null;
  if (clipA && clipA.update) clipA.update(core.layerA.time, dt, {
    deform: eff.deform.A * (1 + eff._audio * eff.audioGain * 2),
    talking: eff.talking.A, pulsing: eff.pulsing.A, textured: eff.textured.A, colModel: eff.colModel.A });
  if (clipB && clipB.update) clipB.update(core.layerB.time, dt, {
    deform: eff.deform.B * (1 + eff._audio * eff.audioGain * 2),
    talking: eff.talking.B, pulsing: eff.pulsing.B, textured: eff.textured.B, colModel: eff.colModel.B });

  core.layerA.root.scale.setScalar(eff.scale.A);
  core.layerB.root.scale.setScalar(eff.scale.B);

  if (showA) renderLayerWithFX(core, core.layerA, 'A', eff, now);
  if (showB) renderLayerWithFX(core, core.layerB, 'B', eff, now);

  core.compU.uA.value = (showA && core.layerA.outRT ? core.layerA.outRT : core.rtA).texture;
  core.compU.uB.value = (showB && core.layerB.outRT ? core.layerB.outRT : core.rtB).texture;
  core.compU.uMix.value = eff.crossfade;
  core.compU.uOpA.value = eff.opA;
  core.compU.uOpB.value = eff.opB;
  core.compU.uBlend.value = blendIndex(eff.blend);
  if (core.mapping && core.mapping.active) {
    core.mapping.render(core.compScene);
  } else {
    core.renderer.setRenderTarget(null);
    core.renderer.render(core.compScene, core.orthoCam);
  }
}
