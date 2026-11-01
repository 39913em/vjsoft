
'use strict';

function initRotationTools() {
  document.getElementById('btn-rot-reset').addEventListener('click', () => {
    [core.layerA, core.layerB].forEach(l => l.root.rotation.set(0, 0, 0));
  });
}
