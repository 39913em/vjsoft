
'use strict';

const SCENE_STORE_KEY = 'vj.scenes';
let userScenes = [];

function loadUserScenes() {
  try {
    const r = JSON.parse(localStorage.getItem(SCENE_STORE_KEY) || '[]');
    userScenes = Array.isArray(r) ? r : [];
  } catch (e) { userScenes = []; }
}
function persistScenes() {
  try { localStorage.setItem(SCENE_STORE_KEY, JSON.stringify(userScenes)); }
  catch (e) { alert('No se pudo guardar en el navegador. Usa "Exportar" para conservar tus escenas.'); }
}

function captureScene(name) {
  const s = makeSnapshot(true);
  return {
    name: name, v: 1,
    active: s.active, params: s.params, effects: s.effects,
    crossfade: s.crossfade, blend: s.blend, opA: s.opA, opB: s.opB,
    autoRotate: s.autoRotate, bpm: s.bpm, audioGain: s.audioGain, videoGain: s.videoGain,
    transitionDur: state.transitionDur, cam: s.cam
  };
}

function setUI(id, val, evt) {
  const el = document.getElementById(id);
  if (!el || val === undefined) return;
  if (el.type === 'checkbox') el.checked = !!val; else el.value = val;
  el.dispatchEvent(new Event(evt, { bubbles: true }));
}

function applyScene(sc) {
  ['A', 'B'].forEach(L => {
    const layer = L === 'A' ? core.layerA : core.layerB;
    const k = sc.active && sc.active[L];
    if (k) setActive(layer, k);         
  });
  Object.keys(sc.params || {}).forEach(k => {
    if (!state[k] || typeof state[k] !== 'object' || !sc.params[k]) return;
    ['A', 'B'].forEach(L => { if (sc.params[k][L] !== undefined) state[k][L] = sc.params[k][L]; });
  });
  Object.keys(sc.effects || {}).forEach(k => {
    if (!state.effects[k]) return;
    ['A', 'B'].forEach(L => { if (sc.effects[k][L] !== undefined) state.effects[k][L] = sc.effects[k][L]; });
  });
  setUI('crossfade', sc.crossfade, 'input');
  setUI('opA', sc.opA, 'input');
  setUI('opB', sc.opB, 'input');
  setUI('blend', sc.blend, 'change');
  setUI('transitionDur', sc.transitionDur, 'input');
  setUI('bpm', sc.bpm, 'input');
  setUI('audioGain', sc.audioGain, 'input');
  setUI('videoGain', sc.videoGain, 'input');
  setUI('autorot', sc.autoRotate, 'change');
  if (sc.cam) {
    core.camera.position.fromArray(sc.cam.pos);
    controls.target.fromArray(sc.cam.target);
    controls.update();
  }
  syncAllControls();
  refreshDeck();
}

function downloadJSON(filename, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function renderSceneGrid() {
  const grid = document.getElementById('scene-grid');
  grid.innerHTML = '';
  const add = (sc, idx, preset) => {
    const b = document.createElement('button');
    b.className = 'scene-btn';
    const n = document.createElement('span'); n.className = 'cname'; n.textContent = sc.name || 'Escena';
    const t = document.createElement('span'); t.className = 'ctag'; t.textContent = preset ? 'Preset' : 'Mía';
    b.appendChild(n); b.appendChild(t);
    if (!preset) {
      const del = document.createElement('span'); del.className = 'del'; del.textContent = '×'; del.title = 'Borrar escena';
      del.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('¿Borrar la escena "' + sc.name + '"?')) { userScenes.splice(idx, 1); persistScenes(); renderSceneGrid(); }
      });
      b.appendChild(del);
    }
    b.addEventListener('click', () => applyScene(sc));
    grid.appendChild(b);
  };
  SCENE_PRESETS.forEach((sc, i) => add(sc, i, true));
  userScenes.forEach((sc, i) => add(sc, i, false));
  if (!SCENE_PRESETS.length && !userScenes.length) {
    const e = document.createElement('div'); e.className = 'note'; e.style.gridColumn = '1 / -1';
    e.textContent = 'Aún no hay escenas. Deja la consola como te guste y pulsa "Guardar escena".';
    grid.appendChild(e);
  }
}

function initScenes() {
  loadUserScenes();
  renderSceneGrid();

  document.getElementById('btn-scene-save').addEventListener('click', () => {
    const name = prompt('Nombre de la escena:', 'Escena ' + (userScenes.length + 1));
    if (name === null) return;
    userScenes.push(captureScene(name.trim() || 'Escena ' + (userScenes.length + 1)));
    persistScenes(); renderSceneGrid();
  });
  document.getElementById('btn-scene-export').addEventListener('click', () => {
    if (!userScenes.length) { alert('No hay escenas propias que exportar.'); return; }
    downloadJSON('vj-escenas.json', { vjScenes: 1, scenes: userScenes });
  });
  const file = document.getElementById('scene-file');
  document.getElementById('btn-scene-import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        const list = Array.isArray(j) ? j : (j.scenes ? j.scenes : [j]);
        const ok = list.filter(s => s && s.active && s.params);
        if (!ok.length) throw new Error('sin escenas válidas');
        ok.forEach(s => userScenes.push(s));
        persistScenes(); renderSceneGrid();
      } catch (e) { alert('Archivo de escenas no válido.'); }
      file.value = '';
    };
    r.readAsText(f);
  });
}
