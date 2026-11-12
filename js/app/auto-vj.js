/* ============================================================
   APP · modo Auto VJ
   Piloto automático progresivo. NUNCA escribe sobre tus valores: superpone su modulación
   encima (con una rampa de entrada de ~8 s y de salida de ~2,5 s), así que al apagarlo
   vuelves exactamente a lo que tenías en manual.
     · Cada compás (8 tiempos): cambia el clip de la capa que NO se ve y desliza el crossfader
       hacia ella durante 4 tiempos; después la otra capa pasa a ser la oculta.
     · Cada compás elige 2-3 efectos distintos, que entran y salen con fundidos de ~3 s.
     · El tiempo es musical (acumula tiempos según el BPM): cambiar el BPM no da saltos.
     · Mientras está activo puedes cambiar a mano el clip de la capa visible, y si mueves el
       crossfader tú tomas el mando desde ahí.
   Usa:      core, state.js, reactivity.js (startAudio, audioLevel), deck.js (refreshDeck, setActive),
             master-controls.js (xfEl, xfVal), output-link.js (makeSnapshot, outputWin)
   Aporta:   initAutoVJ(), updateAuto(), autoMod, autoNudgeXf()
   ============================================================ */
'use strict';

/* efectos que puede usar el piloto automático y su intensidad máxima */
const AUTO_FX = {
  glitch: 0.35, tunnel: 0.35, aberration: 0.45, fluids: 0.30, repetition: 0.30, pixelate: 0.22,
  mirror: 0.50, zoom: 0.50, posterize: 0.40, scan: 0.45, vignette: 0.60, grain: 0.30
};
const AUTO_FX_KEYS = Object.keys(AUTO_FX);

let autoEnv = 0;            // 0..1: cuánto manda el Auto VJ (rampa)
let autoBeats = 0;          // tiempos acumulados
let autoBar = -1;           // compás actual
let autoXf = null;          // posición automática del crossfader (0 = A, 1 = B)
let autoTarget = 0;         // hacia dónde se desliza
let autoFxSet = [];         // efectos activos en este compás
let autoFxW = {};           // peso suavizado de cada efecto (0..1)
let autoBag = [];           // clips pendientes de salir (baraja, evita repetir)
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

/* si el usuario mueve el crossfader con el Auto activo, el piloto sigue desde ahí */
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

/* nuevo compás: cambia la capa oculta, desliza el crossfader hacia ella y cambia el conjunto de efectos */
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

/* Se llama en cada frame. Devuelve true si el Auto VJ está influyendo (autoMod trae los valores efectivos). */
function updateAuto(dtMs) {
  // rampa de intensidad
  const want = state.auto ? 1 : 0, delta = want - autoEnv;
  const step = dtMs * (delta > 0 ? 1 / 8000 : 1 / 2500);
  autoEnv += Math.max(-step, Math.min(step, delta));
  if (autoEnv <= 0.0005 && !state.auto) {
    autoEnv = 0;
    if (autoWas) {                       // acaba de apagarse del todo: devolver la UI a tus valores
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
    // deslizar el crossfader: recorrido completo en 4 tiempos
    if (autoXf === null) autoXf = state.crossfade;
    const xs = dtMs / 60000 * state.bpm / 4;
    autoXf += Math.max(-xs, Math.min(xs, autoTarget - autoXf));
  }

  // crossfader efectivo
  const xf0 = state.crossfade, xfA = autoXf === null ? xf0 : autoXf;
  autoMod.crossfade = xf0 + autoEnv * (xfA - xf0);
  xfEl.value = autoMod.crossfade;
  xfVal.textContent = Math.round(autoMod.crossfade * 100) + '% auto';

  // deformación
  const dd = autoEnv * (0.12 + audio * 0.35);
  autoMod.deform.A = state.deform.A + dd; autoMod.deform.B = state.deform.B + dd;

  // efectos: tus valores + superposición de los elegidos (pesos suavizados ~3 s)
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
