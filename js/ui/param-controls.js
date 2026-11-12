/* ============================================================
   UI · parámetros de capa y efectos (panel derecho)
   Genera los sliders/toggles por capa con selector de destino A / B / AB.
   Usa:      state.js (getParam/setParam/getFx/setFx)
   Aporta:   buildParamControls(), buildEffectControls()
   ============================================================ */
'use strict';

/* Filas creadas (para poder refrescar la UI al cargar una escena) */
const PARAM_ROWS = {};
const FX_ROWS = {};

const PARAM_SPECS = [
  { key: 'scale',      label: 'Escala',          min: 0.2, max: 2.5,  step: 0.1,   fmt: v => v.toFixed(1) },
  { key: 'deform',     label: 'Deformación',     min: 0,   max: 1,    step: 0.01,  fmt: v => v.toFixed(2) },
  { key: 'speed',      label: 'Velocidad',       min: 0,   max: 3,    step: 0.01,  fmt: v => v.toFixed(2) },
  { key: 'rotX',       label: 'Giro X ↑↓',       min: -0.05, max: 0.05, step: 0.001, snap: 0.003, fmt: v => v.toFixed(3) },
  { key: 'rotSpeed',   label: 'Giro Y ←→',       min: -0.05, max: 0.05, step: 0.001, snap: 0.003, fmt: v => v.toFixed(3) },
  { key: 'rotZ',       label: 'Giro Z ↻',        min: -0.05, max: 0.05, step: 0.001, snap: 0.003, fmt: v => v.toFixed(3) },
  { key: 'opacity',    label: 'Opacidad malla',  min: 0.1, max: 1,    step: 0.01,  fmt: v => v.toFixed(2) },
  { key: 'colPrimary', label: 'Color principal', type: 'color' },
  { key: 'colAccent',  label: 'Color acento',    type: 'color' },
  { key: 'colModel',   label: 'Color modelo (.glb, con textura)', type: 'color' },
  { key: 'talking',    label: 'Gesticular',      type: 'toggle' },
  { key: 'pulsing',    label: 'Pulsar',          type: 'toggle' },
  { key: 'textured',   label: 'Textura (.glb)',  type: 'toggle' }
];

function buildParamControls() {
  const container = document.getElementById('param-controls');
  PARAM_SPECS.forEach(spec => {
    const row = document.createElement('div'); row.className = 'param-row';
    const head = document.createElement('div'); head.className = 'param-head';
    const label = document.createElement('span'); label.className = 'param-label'; label.textContent = spec.label;
    head.appendChild(label);

    const tg = document.createElement('div'); tg.className = 'target-group';
    ['A','B','AB'].forEach(t => {
      const b = document.createElement('button');
      b.textContent = t; b.dataset.t = t;
      if (state.target[spec.key] === t) b.classList.add('active');
      b.addEventListener('click', () => {
        state.target[spec.key] = t;
        tg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.t === t));
        syncControl(spec, row);
      });
      tg.appendChild(b);
    });
    head.appendChild(tg);

    let valEl = null;
    if (spec.type !== 'toggle') {
      valEl = document.createElement('span'); valEl.className = 'param-val';
      const v = getParam(spec.key);
      valEl.textContent = spec.type === 'color' ? '' : spec.fmt(v);
      head.appendChild(valEl);
    }
    row.appendChild(head);

    if (spec.type === 'color') {
      const input = document.createElement('input'); input.type = 'color';
      input.value = getParam(spec.key);
      input.addEventListener('input', e => setParam(spec.key, e.target.value));
      row.appendChild(input); row._input = input;
    } else if (spec.type === 'toggle') {
      const btn = document.createElement('button');
      btn.className = 'mini' + (getParam(spec.key) ? ' on' : '');
      btn.textContent = getParam(spec.key) ? 'ON' : 'OFF';
      btn.addEventListener('click', () => {
        const next = !getParam(spec.key);
        setParam(spec.key, next);
        btn.textContent = next ? 'ON' : 'OFF';
        btn.classList.toggle('on', next);
      });
      row.appendChild(btn); row._input = btn;
    } else {
      const input = document.createElement('input'); input.type = 'range';
      input.min = spec.min; input.max = spec.max; input.step = spec.step;
      input.value = getParam(spec.key);
      const def = getParam(spec.key);
      input.addEventListener('input', e => {
        let v = parseFloat(e.target.value);
        if (spec.snap && Math.abs(v) < spec.snap) { v = 0; e.target.value = 0; }   // zona muerta: el 0 es el 0
        setParam(spec.key, v);
        valEl.textContent = spec.fmt(v);
      });
      input.addEventListener('dblclick', () => {                                  // doble clic: valor inicial
        input.value = def; setParam(spec.key, def); valEl.textContent = spec.fmt(def);
      });
      row.appendChild(input); row._input = input; row._valEl = valEl;
    }
    PARAM_ROWS[spec.key] = row;
    container.appendChild(row);
  });
}

function syncControl(spec, row) {
  if (spec.type === 'color') row._input.value = getParam(spec.key);
  else if (spec.type === 'toggle') {
    const v = getParam(spec.key);
    row._input.textContent = v ? 'ON' : 'OFF';
    row._input.classList.toggle('on', v);
  } else {
    const v = getParam(spec.key);
    row._input.value = v; row._valEl.textContent = spec.fmt(v);
  }
}

const EFFECT_SPECS = [
  { key: 'repetition', label: 'Repetición' },
  { key: 'tunnel',     label: 'Túnel' },
  { key: 'glitch',     label: 'Glitch' },
  { key: 'aberration', label: 'Aberración cromática' },
  { key: 'borders',    label: 'Bordes' },
  { key: 'fluids',     label: 'Fluidos' },
  { key: 'fractal',    label: 'Fractal' },
  { key: 'pixelate',   label: 'Pixelado' },
  { key: 'mirror',     label: 'Espejo' },
  { key: 'zoom',       label: 'Zoom pulsante' },
  { key: 'posterize',  label: 'Posterizar' },
  { key: 'scan',       label: 'Líneas de escaneo' },
  { key: 'invert',     label: 'Invertir' },
  { key: 'vignette',   label: 'Viñeta' },
  { key: 'grain',      label: 'Grano' }
];

function buildEffectControls() {
  const container = document.getElementById('effect-controls');
  EFFECT_SPECS.forEach(spec => {
    const row = document.createElement('div'); row.className = 'param-row';
    const head = document.createElement('div'); head.className = 'param-head';
    const label = document.createElement('span'); label.className = 'param-label'; label.textContent = spec.label;
    head.appendChild(label);

    const tg = document.createElement('div'); tg.className = 'target-group';
    ['A','B','AB'].forEach(t => {
      const b = document.createElement('button');
      b.textContent = t; b.dataset.t = t;
      if (state.targetFx[spec.key] === t) b.classList.add('active');
      b.addEventListener('click', () => {
        state.targetFx[spec.key] = t;
        tg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.t === t));
        syncFxControl(spec, row);
      });
      tg.appendChild(b);
    });
    head.appendChild(tg);

    const val = document.createElement('span'); val.className = 'param-val';
    val.textContent = getFx(spec.key).toFixed(2);
    head.appendChild(val);
    row.appendChild(head);

    const input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 1; input.step = 0.01;
    input.value = getFx(spec.key);
    input.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      setFx(spec.key, v);
      val.textContent = v.toFixed(2);
    });
    input.addEventListener('dblclick', () => { input.value = 0; setFx(spec.key, 0); val.textContent = (0).toFixed(2); });
    row.appendChild(input); row._input = input; row._valEl = val;
    FX_ROWS[spec.key] = row;
    container.appendChild(row);
  });
}

function syncFxControl(spec, row) {
  const v = getFx(spec.key);
  row._input.value = v; row._valEl.textContent = v.toFixed(2);
}

/* Refresca todos los controles desde el estado (usado al aplicar una escena) */
function syncAllControls() {
  PARAM_SPECS.forEach(spec => { if (PARAM_ROWS[spec.key]) syncControl(spec, PARAM_ROWS[spec.key]); });
  EFFECT_SPECS.forEach(spec => { if (FX_ROWS[spec.key]) syncFxControl(spec, FX_ROWS[spec.key]); });
}
