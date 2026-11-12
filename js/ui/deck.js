/* ============================================================
   UI · deck (panel izquierdo)
   Selector de capa A/B, parrilla de clips, carga de la cabeza 3D y estado.
   Usa:      core (app/main.js), CLIP_DEFS, setActive(), installClip(), loadHead()
   Aporta:   initDeck(), refreshDeck(), triggerClip(), addClipButton()
   ============================================================ */
'use strict';

let selectedLayer = 'A';

function refreshDeck() {
  document.querySelectorAll('.clip').forEach(btn => {
    const k = btn.dataset.clip;
    btn.classList.toggle('on-a', core.layerA.active === k);
    btn.classList.toggle('on-b', core.layerB.active === k);
    btn.classList.toggle('locked', !core.layerA.clips[k] || !core.layerB.clips[k]);
  });
}
function triggerClip(key) {
  const layer = selectedLayer === 'A' ? core.layerA : core.layerB;
  if (!setActive(layer, key)) return;
  refreshDeck();
}

function addClipButton(key, idx) {
  const def = CLIP_DEFS[key];
  const btn = document.createElement('button');
  btn.className = 'clip' + (def.head ? ' locked' : '');
  btn.dataset.clip = key;
  btn.innerHTML =
    '<span class="num">' + String(idx+1).padStart(2, '0') + '</span>' +
    '<span class="cname">' + def.label + '</span>' +
    '<span class="ctag">' + def.tag + '</span>';
  btn.addEventListener('click', () => triggerClip(key));
  if (def.media) {                       // clips añadidos por el usuario: se pueden quitar
    const del = document.createElement('span');
    del.className = 'del'; del.textContent = '×'; del.title = 'Quitar de la biblioteca';
    del.addEventListener('click', e => { e.stopPropagation(); mediaRemove(key); });
    btn.appendChild(del);
  }
  document.getElementById('clip-grid').appendChild(btn);
}

function initDeck() {
  const statusEl = document.getElementById('status');

  Object.keys(CLIP_DEFS).forEach((key, idx) => addClipButton(key, idx));

  document.querySelectorAll('.ltab').forEach(b => {
    b.addEventListener('click', () => {
      selectedLayer = b.dataset.layer;
      document.querySelectorAll('.ltab').forEach(x => x.classList.toggle('active', x === b));
    });
  });

  loadHead(core, () => {
    Object.keys(CLIP_DEFS).forEach(key => {
      if (CLIP_DEFS[key].head) {
        installClip(core, core.layerA, key);
        installClip(core, core.layerB, key);
      }
    });
    refreshDeck();
    statusEl.textContent = 'Cabeza 3D cargada · ' + Object.keys(CLIP_DEFS).length + ' clips';
  });
  statusEl.textContent = 'Cargando cabeza 3D…';
}
