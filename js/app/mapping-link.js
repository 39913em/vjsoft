/* ============================================================
   APP · mapping (lado principal)
   Panel de control del mapping: activar, editar en la salida, patrón, restablecer,
   exportar/importar y persistencia en el navegador.
   Usa:      outputWin, openOutput() (output-link.js), mappingDefaults(), mapSanitize()
   Aporta:   initMappingLink(), sendMapping()
   ============================================================ */
'use strict';

const MAP_STORE_KEY = 'vj.mapping';
const mapState = { data: mappingDefaults(), edit: false, pattern: false };

function loadMapping() {
  try { mapState.data = mapSanitize(JSON.parse(localStorage.getItem(MAP_STORE_KEY))); } catch (e) {}
}
function saveMapping() {
  try { localStorage.setItem(MAP_STORE_KEY, JSON.stringify(mapState.data)); } catch (e) {}
}
function sendMapping() {
  if (outputWin && !outputWin.closed) {
    outputWin.postMessage({ type: 'mapping', data: mapState.data, edit: mapState.edit, pattern: mapState.pattern }, '*');
  }
}

function initMappingLink() {
  loadMapping();
  const bOn = document.getElementById('btn-map-on'), bEdit = document.getElementById('btn-map-edit');
  const bPat = document.getElementById('btn-map-pattern'), bReset = document.getElementById('btn-map-reset');
  const file = document.getElementById('map-file');

  function refreshButtons() {
    bOn.classList.toggle('on', mapState.data.enabled);
    bOn.textContent = 'Mapping — ' + (mapState.data.enabled ? 'ON' : 'OFF');
    bEdit.classList.toggle('on', mapState.edit);
    bEdit.textContent = mapState.edit ? 'Editando en salida' : 'Editar en salida';
    bPat.classList.toggle('on', mapState.pattern);
    bPat.textContent = 'Patrón — ' + (mapState.pattern ? 'ON' : 'OFF');
  }
  function changed() { saveMapping(); refreshButtons(); sendMapping(); }

  bOn.addEventListener('click', () => { mapState.data.enabled = !mapState.data.enabled; changed(); });
  bEdit.addEventListener('click', () => {
    mapState.edit = !mapState.edit;
    if (mapState.edit && (!outputWin || outputWin.closed)) openOutput();   // al abrirse, 'ready' envía el estado
    changed();
  });
  bPat.addEventListener('click', () => { mapState.pattern = !mapState.pattern; changed(); });
  bReset.addEventListener('click', () => {
    if (!confirm('¿Restablecer todo el mapping (esquinas, malla y máscara)?')) return;
    const en = mapState.data.enabled; mapState.data = mappingDefaults(); mapState.data.enabled = en; changed();
  });
  document.getElementById('btn-map-export').addEventListener('click', () => downloadJSON('vj-mapping.json', mapState.data));
  document.getElementById('btn-map-import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { mapState.data = mapSanitize(JSON.parse(r.result)); changed(); }
      catch (e) { alert('Archivo de mapping no válido.'); }
      file.value = '';
    };
    r.readAsText(f);
  });

  window.addEventListener('message', e => {
    const d = e.data; if (!d) return;
    if (d.type === 'mapping') {                       // el editor de la salida cambió algo
      mapState.data = mapSanitize(d.data); mapState.edit = !!d.edit; mapState.pattern = !!d.pattern;
      saveMapping(); refreshButtons();
    } else if (d.type === 'ready') setTimeout(sendMapping, 50);
  });
  refreshButtons();
}
