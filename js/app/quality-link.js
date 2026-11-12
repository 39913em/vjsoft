/* ============================================================
   APP · calidad y rendimiento
   Selectores de calidad (vista previa y salida) y medidor de fps.
   Usa:      makeQuality(), core
   Aporta:   initQualityLink(), initOutputQuality(), mainQ
   ============================================================ */
'use strict';

let mainQ = null;
const QUALITY_KEY = 'vj.quality';

/* lado salida: recibe el modo desde la consola */
function initOutputQuality(core) {
  const q = makeQuality(core);
  window.addEventListener('message', e => {
    const d = e.data;
    if (d && d.type === 'quality') q.setMode(d.mode);
  });
  return q;
}

/* lado principal */
function initQualityLink() {
  mainQ = makeQuality(core);
  let prefs = { preview: '1', output: '1' };      // 100 % por defecto: máxima nitidez
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(QUALITY_KEY)) || {}); } catch (e) {}

  const selP = document.getElementById('q-preview'), selO = document.getElementById('q-output');
  const fpsMain = document.getElementById('fps-main'), fpsOut = document.getElementById('fps-out');
  selP.value = prefs.preview; selO.value = prefs.output;
  mainQ.setMode(selP.value);

  const save = () => { try { localStorage.setItem(QUALITY_KEY, JSON.stringify({ preview: selP.value, output: selO.value })); } catch (e) {} };
  const sendQuality = () => {
    if (outputWin && !outputWin.closed) outputWin.postMessage({ type: 'quality', mode: selO.value }, '*');
  };
  selP.addEventListener('change', () => { mainQ.setMode(selP.value); save(); });
  selO.addEventListener('change', () => { sendQuality(); save(); });

  window.addEventListener('message', e => {
    const d = e.data; if (!d) return;
    if (d.type === 'ready') setTimeout(sendQuality, 30);
    else if (d.type === 'frame' && d.fps) fpsOut.textContent = d.fps + ' fps · ' + Math.round(d.scale * 100) + '%';
  });
  // efecto cristal (desenfoque tras los paneles): apagado por defecto porque cuesta muchos fps
  const chkGlass = document.getElementById('chk-glass');
  let glass = false; try { glass = localStorage.getItem('vj.glass') === '1'; } catch (e) {}
  chkGlass.checked = glass; document.body.classList.toggle('glass', glass);
  chkGlass.addEventListener('change', () => {
    document.body.classList.toggle('glass', chkGlass.checked);
    try { localStorage.setItem('vj.glass', chkGlass.checked ? '1' : '0'); } catch (e) {}
  });

  setInterval(() => { fpsMain.textContent = Math.round(mainQ.fps) + ' fps · ' + Math.round(core.scale * 100) + '%'; }, 500);
}
