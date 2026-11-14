/* ============================================================
   APP · atajos de teclado, PANIC y ayuda
   Maneja la consola desde el teclado. Pulsa H para ver la lista.
   No se activa mientras escribes en un cuadro de texto o tienes abierto un desplegable.
   Usa:      state, core, selectedLayer, triggerClip(), PARAM_ROWS, EFFECT_SPECS, toggleFxMute(), setFxMuteAll(),
             moveLayers(), resetPosition(), takeToOutput(), openOutput(), setUI(), syncAllControls()
   Aporta:   initShortcuts(), panic(), toast()
   ============================================================ */
'use strict';

/* ---------- aviso flotante ---------- */
let toastEl = null, toastTimer = null;
function toast(msg, warn, ms) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'vj-toast'; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.className = 'show' + (warn ? ' warn' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms || 1600);
}

/* ---------- PANIC: deja la salida limpia sin tocar escenas ni clips ---------- */
function panic() {
  if (state.auto) document.getElementById('btn-auto').click();           // el Auto VJ reescribe efectos y crossfader
  ['A', 'B'].forEach(L => { state.rotSpeed[L] = 0; state.rotX[L] = 0; state.rotZ[L] = 0; });
  Object.keys(state.effects).forEach(k => { state.effects[k].A = 0; state.effects[k].B = 0; });
  setFxMuteAll(true);                                                    // además corta lo que añaden audio y movimiento
  setUI('crossfade', 0.5, 'input');
  setUI('opA', 1, 'input'); setUI('opB', 1, 'input');
  syncAllControls();
  toast('PANIC · efectos y giros detenidos, crossfader al centro. Shift+F reactiva los efectos.', true, 3200);
}

/* ---------- ayuda ---------- */
const HELP_SECTIONS = [
  ['Mover el objeto', [
    ['Alt + arrastrar', 'Mover X / Y de la capa activa'],
    ['Alt + clic derecho / rueda', 'Mover en Z (acercar / alejar)'],
    ['Shift + Alt', 'Mover las dos capas a la vez'],
    ['← → ↑ ↓', 'Mover X / Y (Shift = más rápido)'],
    ['PgUp / PgDn   ·   E / Q', 'Acercar / alejar (Z)'],
    ['L', 'Flechas mueven A+B juntas (on/off)'],
    ['R  ·  Shift+R', 'Reiniciar posición (capa activa · ambas)']]],
  ['Capas y clips', [
    ['A  ·  B', 'Elegir capa activa'],
    ['1 … 9, 0', 'Lanzar clip 1–10 en la capa activa'],
    ['Shift + 1 … 0', 'Lanzar clip 11–20'],
    ['T  ·  P  ·  Y', 'Textura · Pulsar · Gesticular'],
    ['−  ·  +', 'Escala de la capa'],
    ['G  ·  Shift+G', 'Giro automático on/off · Reiniciar giro']]],
  ['Mezcla y salida', [
    ['Z  ·  X  ·  C', 'Crossfader a A · a B · al centro'],
    [',  ·  .', 'Crossfader ← → (Shift = más)'],
    ['Espacio', 'Enviar a salida'],
    ['O', 'Abrir pantalla de salida'],
    ['V', 'Auto VJ on/off']]],
  ['Efectos', [
    ['F, luego 1 … 9, 0', 'Silenciar / activar ese efecto'],
    ['F, luego Shift + 1 … 5', 'Efectos 11–15'],
    ['Shift + F', 'Silenciar / reactivar TODOS los efectos'],
    ['Esc', 'PANIC (si estás en modo F, solo sale del modo)'],
    ['H  ·  ?', 'Esta ayuda']]]
];
let helpEl = null;
function buildHelp() {
  helpEl = document.createElement('div'); helpEl.id = 'help-overlay';
  let h = '<div id="help-box"><h3>Atajos de teclado</h3><div class="cols">';
  HELP_SECTIONS.forEach(([title, rows]) => {
    h += '<div><h4>' + title + '</h4>';
    rows.forEach(([k, d]) => { h += '<div class="k"><kbd>' + k + '</kbd><span>' + d + '</span></div>'; });
    h += '</div>';
  });
  h += '</div><div class="foot">Número de cada efecto: el que aparece junto a su nombre en el panel. ' +
       'Los atajos no actúan mientras escribes en un cuadro de texto. Clic o Esc para cerrar.</div></div>';
  helpEl.innerHTML = h;
  helpEl.addEventListener('click', () => helpEl.classList.remove('show'));
  document.body.appendChild(helpEl);
}
function toggleHelp(force) {
  if (!helpEl) buildHelp();
  helpEl.classList.toggle('show', force === undefined ? !helpEl.classList.contains('show') : force);
}

/* ---------- teclas ---------- */
function initShortcuts() {
  let fxUntil = 0;                                   // modo FX activo hasta este instante
  const fxActive = () => performance.now() < fxUntil;

  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const crossfadeTo = v => setUI('crossfade', clampN(v, 0, 1), 'input');
  const click = id => { const el = document.getElementById(id); if (el) el.click(); };
  const toggleParam = (key, name) => {
    const row = PARAM_ROWS[key]; if (!row) return;
    row._input.click();
    toast(name + ': ' + (getParam(key) ? 'ON' : 'OFF'));
  };

  document.getElementById('btn-panic').addEventListener('click', panic);
  document.getElementById('btn-help').addEventListener('click', () => toggleHelp());
  document.getElementById('btn-fx-off').addEventListener('click', () => setFxMuteAll(!state.fxMuteAll));

  // sin esto, tras usar un botón/slider/desplegable el teclado se queda "atrapado" en él
  window.addEventListener('pointerup', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && (a.tagName === 'BUTTON' || (a.tagName === 'INPUT' && a.type === 'range'))) a.blur();
  }, 0));
  window.addEventListener('change', e => { if (e.target && e.target.tagName === 'SELECT') e.target.blur(); }, true);

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable) ||
                   (tag === 'INPUT' && !/^(range|checkbox|radio|button|color)$/.test(t.type));
    if (typing) return;
    const onRange = tag === 'INPUT' && t.type === 'range';
    const key = e.key, k = key.length === 1 ? key.toLowerCase() : key;
    const used = () => e.preventDefault();

    // ayuda abierta: solo Esc / H la cierran
    if (helpEl && helpEl.classList.contains('show')) {
      if (key === 'Escape' || k === 'h' || key === '?') { toggleHelp(false); used(); }
      return;
    }

    // dígitos: clip (o efecto si el modo FX está activo)
    const dm = /^Digit(\d)$/.exec(e.code || '');
    if (dm) {
      const n = parseInt(dm[1], 10), idx = (n === 0 ? 9 : n - 1) + (e.shiftKey ? 10 : 0);
      used();
      if (fxActive()) {
        const spec = EFFECT_SPECS[idx];
        if (spec) {
          const muted = toggleFxMute(spec.key);
          fxUntil = performance.now() + 3500;
          toast('Efecto «' + spec.label + '»: ' + (muted ? 'SILENCIADO' : 'activo'), muted, 1400);
        }
      } else {
        const keyClip = Object.keys(CLIP_DEFS)[idx];
        if (keyClip) { triggerClip(keyClip); toast('Capa ' + selectedLayer + ' → ' + CLIP_DEFS[keyClip].label); }
      }
      return;
    }

    switch (k) {
      case 'Escape':
        used();
        if (fxActive()) { fxUntil = 0; toast('Modo FX cerrado'); } else panic();
        return;
      case 'h': case '?': used(); toggleHelp(true); return;

      case 'a': case 'b': {
        used();
        const btn = document.querySelector('.ltab[data-layer="' + k.toUpperCase() + '"]');
        if (btn) btn.click();
        toast('Capa activa: ' + k.toUpperCase());
        return;
      }

      // ---- mover objeto ----
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
        if (onRange) return;                          // en un slider enfocado, las flechas son del slider
        used();
        const s = e.shiftKey ? 1 : 0.2;
        moveLayers(k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, k === 'ArrowUp' ? s : k === 'ArrowDown' ? -s : 0, 0);
        return;
      }
      case 'PageUp': case 'PageDown': {
        if (onRange) return;
        used(); moveLayers(0, 0, (k === 'PageUp' ? -1 : 1) * (e.shiftKey ? 1 : 0.2)); return;
      }
      case 'e': used(); moveLayers(0, 0, -(e.shiftKey ? 1 : 0.2)); return;
      case 'q': used(); moveLayers(0, 0, (e.shiftKey ? 1 : 0.2)); return;
      case 'l': used(); moveBoth = !moveBoth; toast('Mover: ' + (moveBoth ? 'capas A + B juntas' : 'solo la capa activa')); return;
      case 'r': used(); resetPosition(e.shiftKey); return;

      // ---- capa ----
      case 't': used(); toggleParam('textured', 'Textura'); return;
      case 'p': used(); toggleParam('pulsing', 'Pulsar'); return;
      case 'y': used(); toggleParam('talking', 'Gesticular'); return;
      case '-': case '_': case '+': case '=': {
        used();
        const dir = (k === '-' || k === '_') ? -0.1 : 0.1;
        setParam('scale', Math.round(clampN(getParam('scale') + dir, 0.2, 2.5) * 100) / 100);
        syncAllControls(); toast('Escala: ' + getParam('scale').toFixed(1));
        return;
      }
      case 'g':
        used();
        if (e.shiftKey) { click('btn-rot-reset'); toast('Giro reiniciado'); }
        else { click('autorot'); toast('Giro automático: ' + (state.autoRotate ? 'ON' : 'OFF')); }
        return;

      // ---- mezcla / salida ----
      case 'z': used(); crossfadeTo(0);   toast('Crossfader → A'); return;
      case 'x': used(); crossfadeTo(1);   toast('Crossfader → B'); return;
      case 'c': used(); crossfadeTo(0.5); toast('Crossfader al centro'); return;
      case ',': case '<': used(); crossfadeTo(state.crossfade - (e.shiftKey ? 0.25 : 0.05)); return;
      case '.': case '>': used(); crossfadeTo(state.crossfade + (e.shiftKey ? 0.25 : 0.05)); return;
      case ' ': used(); takeToOutput(); return;
      case 'o': used(); openOutput(); return;
      case 'v': used(); click('btn-auto'); toast('Auto VJ: ' + (state.auto ? 'ON' : 'OFF')); return;

      // ---- efectos ----
      case 'f':
        used();
        if (e.shiftKey) {
          setFxMuteAll(!state.fxMuteAll);
          toast(state.fxMuteAll ? 'TODOS los efectos silenciados' : 'Efectos reactivados', state.fxMuteAll);
        } else if (fxActive()) { fxUntil = 0; toast('Modo FX cerrado'); }
        else { fxUntil = performance.now() + 3500; toast('Modo FX · pulsa el número del efecto para silenciarlo / activarlo (Shift+1…5 = 11–15)', false, 3500); }
        return;
    }
  });
}
