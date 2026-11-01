
'use strict';

const AUTO_FX = {
  glitch: 0.35, tunnel: 0.35, aberration: 0.45, fluids: 0.30, repetition: 0.30, pixelate: 0.22,
  mirror: 0.50, zoom: 0.50, posterize: 0.40, scan: 0.45, vignette: 0.60, grain: 0.30
};
const AUTO_FX_KEYS = Object.keys(AUTO_FX);

let autoEnv = 0;            
let autoBeats = 0;          
let autoBar = -1;          
let autoXf = null;          
let autoTarget = 0;         
let autoFxSet = [];        
let autoFxW = {};           
let autoBag = [];           
let autoWas = false;
const autoMod = { crossfade: 0.5, deform: { A: 0, B: 0 }, effects: {} };

function initAutoVJ() {
  const btnAuto = document.getElementById('btn-auto');
  btnAuto.addEventListener('click', () => {
    state.auto = !state.auto;
    btnAuto.classList.toggle('auto-on', state.auto);
    btnAuto.textContent = 'Auto VJ — ' + (state.auto ? 'ON' : 'OFF');
    if (state.auto) {
      autoXf = state.crossfade; autoTarget = state.crossfade < 0.5 ? 0 : 1;
      autoBeats = 0; autoBar = -1; autoFxSet = []; autoBag = [];
      if (!state.audioOn) {
        state.audioOn = true;
        startAudio();
        document.getElementById('btn-mic').classList.add('on');
      }
    }
  });
}

function autoNudgeXf(v) { if (state.auto && autoXf !== null) { autoXf = v; autoTarget = v < 0.5 ? 0 : 1; } }

function autoShuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function autoPickClip() {
  const all = Object.keys(CLIP_DEFS).filter(k => CLIP_DEFS[k].auto !== false && core.layerA.clips[k] && core.layerB.clips[k]);
  if (!all.length) return null;
  const ok = k => all.indexOf(k) >= 0 && k !== core.layerA.active && k !== core.layerB.active;
  let i = autoBag.findIndex(ok);
  if (i < 0) { autoBag = autoShuffle(all.slice()); i = autoBag.findIndex(ok); if (i < 0) i = 0; }
  return autoBag.splice(i, 1)[0];
}

function autoNewBar() {
  const visible = (autoXf !== null ? autoXf : state.crossfade) < 0.5 ? 'A' : 'B';
  const hidden = visible === 'A' ? core.layerB : core.layerA;
  const key = autoPickClip();
  if (key && key !== hidden.active) setActive(hidden, key);
  autoTarget = visible === 'A' ? 1 : 0;

  const prev = autoFxSet, pool = AUTO_FX_KEYS.filter(k => prev.indexOf(k) < 0);
  autoFxSet = autoShuffle(pool).slice(0, 2 + Math.floor(Math.random() * 2));

  refreshDeck();
  if (outputWin && !outputWin.closed) outputWin.postMessage(makeSnapshot(true, 400), '*');
}

function updateAuto(dtMs) {
  const want = state.auto ? 1 : 0, delta = want - autoEnv;
  const step = dtMs * (delta > 0 ? 1 / 8000 : 1 / 2500);
  autoEnv += Math.max(-step, Math.min(step, delta));
  if (autoEnv <= 0.0005 && !state.auto) {
    autoEnv = 0;
    if (autoWas) {                       
      autoWas = false; autoFxW = {};
      xfEl.value = state.crossfade; xfVal.textContent = Math.round(state.crossfade * 100) + '%';
    }
    return false;
  }
  autoWas = true;

  const audio = isFinite(audioLevel) ? audioLevel : 0;

  if (state.auto) {
    autoBeats += dtMs / 60000 * state.bpm;
    const bar = Math.floor(autoBeats / 8);
    if (bar !== autoBar) { autoBar = bar; autoNewBar(); }
    if (autoXf === null) autoXf = state.crossfade;
    const xs = dtMs / 60000 * state.bpm / 4;
    autoXf += Math.max(-xs, Math.min(xs, autoTarget - autoXf));
  }

  const xf0 = state.crossfade, xfA = autoXf === null ? xf0 : autoXf;
  autoMod.crossfade = xf0 + autoEnv * (xfA - xf0);
  xfEl.value = autoMod.crossfade;
  xfVal.textContent = Math.round(autoMod.crossfade * 100) + '% auto';

  const dd = autoEnv * (0.12 + audio * 0.35);
  autoMod.deform.A = state.deform.A + dd; autoMod.deform.B = state.deform.B + dd;

  const wstep = dtMs / 3000;
  AUTO_FX_KEYS.forEach((k, i) => {
    const target = autoFxSet.indexOf(k) >= 0 && state.auto ? 1 : 0;
    const w0 = autoFxW[k] || 0;
    const w = w0 + Math.max(-wstep, Math.min(wstep, target - w0));
    autoFxW[k] = w;
    const period = [2, 4, 8, 3][i % 4];
    const lfo = 0.5 + 0.5 * Math.sin(autoBeats * Math.PI * 2 / period + i * 1.7);
    const add = autoEnv * w * AUTO_FX[k] * (0.35 + 0.65 * lfo + audio * 0.6);
    autoMod.effects[k] = {
      A: Math.min(1, state.effects[k].A + add), B: Math.min(1, state.effects[k].B + add)
    };
  });
  Object.keys(state.effects).forEach(k => { if (!(k in AUTO_FX)) autoMod.effects[k] = state.effects[k]; });
  return true;
}
