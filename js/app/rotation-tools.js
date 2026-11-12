/* ============================================================
   APP · herramientas de giro
   Reinicia la orientación de ambas capas (X, Y y Z a 0).
   Usa:      core (app/main.js)
   Aporta:   initRotationTools()
   ============================================================ */
'use strict';

function initRotationTools() {
  document.getElementById('btn-rot-reset').addEventListener('click', () => {
    [core.layerA, core.layerB].forEach(l => l.root.rotation.set(0, 0, 0));
  });
}
