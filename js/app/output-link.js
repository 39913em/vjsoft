/* ============================================================
   APP · enlace con la pantalla de salida (lado principal)
   Abre la ventana de salida, envía estados y recibe el retorno (monitor).
   Usa:      core, controls, state.js
   Aporta:   initOutputLink(), openOutput(), takeToOutput(), makeSnapshot()
   ============================================================ */
'use strict';

let outputWin = null;
let lastLiveSend = 0;

function makeSnapshot(instant, clipFade) {
  return {
    type: 'state',
    active: { A: core.layerA.active, B: core.layerB.active },
    params: {
      scale: { ...state.scale }, deform: { ...state.deform },
      speed: { ...state.speed }, rotSpeed: { ...state.rotSpeed },
          rotX: { ...state.rotX }, rotZ: { ...state.rotZ },
      opacity: { ...state.opacity }, colPrimary: { ...state.colPrimary },
      colAccent: { ...state.colAccent }, colModel: { ...state.colModel }, talking: { ...state.talking },
      pulsing: { ...state.pulsing },
      textured: { ...state.textured }
    },
    time: { A: core.layerA.time, B: core.layerB.time },
    rot:  { A: core.layerA.root.rotation.y, B: core.layerB.root.rotation.y },
    cam:  { pos: core.camera.position.toArray(), target: controls.target.toArray() },
    crossfade: state.crossfade, blend: state.blend, opA: state.opA, opB: state.opB,
    autoRotate: state.autoRotate, effects: JSON.parse(JSON.stringify(state.effects)),
    bpm: state.bpm, audioGain: state.audioGain, videoGain: state.videoGain,
    instantParams: !!instant,
    clipCrossfadeMs: clipFade !== undefined ? clipFade : (state.transitionDur || 600)
  };
}

function openOutput() {
  if (outputWin && !outputWin.closed) { outputWin.focus(); return; }
  const W = screen.availWidth, H = screen.availHeight;
  const w = window.open('', 'vjout',
    `width=${W},height=${H},left=0,top=0,menubar=no,toolbar=no,location=no,status=no`);
  if (!w) { alert('Permite ventanas emergentes para abrir la pantalla de salida.'); return; }
  w.document.open();
  w.document.write('<!DOCTYPE html>\n' + document.documentElement.outerHTML);
  w.document.close();
  outputWin = w;
  setTimeout(() => { if (outputWin && !outputWin.closed) takeToOutput(); }, 600);
}

function takeToOutput() {
  if (!outputWin || outputWin.closed) { openOutput(); return; }
  outputWin.postMessage(makeSnapshot(false), '*');
  const b = document.getElementById('btn-take');
  b.classList.add('flash');
  setTimeout(() => b.classList.remove('flash'), 250);
}

function initOutputLink() {
  document.getElementById('btn-open-output').addEventListener('click', openOutput);
  document.getElementById('btn-take').addEventListener('click', takeToOutput);

  const monitorImg = document.getElementById('monitor-img');
  window.addEventListener('message', e => {
    const d = e.data; if (!d) return;
    if (d.type === 'frame' && d.url) monitorImg.src = d.url;
    else if (d.type === 'ready') takeToOutput();
  });
}
