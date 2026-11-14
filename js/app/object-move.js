/* ============================================================
   APP · mover el objeto (Alt + ratón / teclado)
   Desplaza el objeto de la capa activa en X / Y / Z para reacomodarlo en pantalla.
     · Alt + arrastrar (izq.)          → X / Y (en el plano de la pantalla)
     · Alt + arrastrar (der.) o rueda  → Z (acercar / alejar)
     · Shift + Alt                     → mueve las dos capas a la vez
   Los ejes siguen a la cámara: "izquierda" siempre es izquierda en pantalla, aunque la hayas orbitado.
   La posición vive en state.pos y viaja a la salida en vivo (main-loop) y en las escenas.
   Usa:      core, state.pos, selectedLayer (deck.js), toast() (shortcuts.js)
   Aporta:   initObjectMove(), moveLayers(), resetPosition(), moveBoth
   ============================================================ */
'use strict';

const POS_LIMIT = 60;
let moveBoth = false;          // true = las flechas / el ratón mueven A y B juntas (tecla L)

function layerKeysToMove(forceBoth) { return (forceBoth || moveBoth) ? ['A', 'B'] : [selectedLayer]; }

function posText(keys) {
  return keys.map(L => 'Capa ' + L + ' · X ' + state.pos[L].x.toFixed(2) + '  Y ' + state.pos[L].y.toFixed(2) +
                       '  Z ' + state.pos[L].z.toFixed(2)).join('   |   ');
}

/* dx, dy, dz en unidades de mundo, relativas a la cámara (dz > 0 = alejar) */
function moveLayers(dx, dy, dz, forceBoth) {
  const cam = core.camera; cam.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  const up    = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const fwd   = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
  const v = right.multiplyScalar(dx).add(up.multiplyScalar(dy)).add(fwd.multiplyScalar(dz));
  const keys = layerKeysToMove(forceBoth);
  keys.forEach(L => {
    const p = state.pos[L];
    p.x = Math.max(-POS_LIMIT, Math.min(POS_LIMIT, p.x + v.x));
    p.y = Math.max(-POS_LIMIT, Math.min(POS_LIMIT, p.y + v.y));
    p.z = Math.max(-POS_LIMIT, Math.min(POS_LIMIT, p.z + v.z));
  });
  toast(posText(keys));
}

function resetPosition(both) {
  const keys = both ? ['A', 'B'] : layerKeysToMove(false);
  keys.forEach(L => { state.pos[L].x = 0; state.pos[L].y = 0; state.pos[L].z = 0; });
  toast('Posición reiniciada · ' + keys.map(L => 'capa ' + L).join(' y '));
}

/* unidades de mundo que equivale 1 píxel de pantalla a la distancia del objeto */
function worldPerPixel(L) {
  const layer = L === 'A' ? core.layerA : core.layerB;
  const dist = Math.max(0.5, core.camera.position.distanceTo(layer.root.position));
  const h = core.renderer.domElement.clientHeight || window.innerHeight;
  return 2 * Math.tan(THREE.MathUtils.degToRad(core.camera.fov / 2)) * dist / h;
}

function initObjectMove() {
  const dom = core.renderer.domElement, host = dom.parentElement || dom;
  let drag = null;
  const eat = e => { e.preventDefault(); e.stopPropagation(); };

  // Captura en el contenedor: así OrbitControls y el zoom con botón derecho no llegan a verlo
  host.addEventListener('pointerdown', e => {
    if (!e.altKey) return;
    eat(e);
    drag = { x: e.clientX, y: e.clientY, z: e.button === 2 || e.button === 1 };
  }, true);
  host.addEventListener('mousedown', e => { if (e.altKey) eat(e); }, true);
  host.addEventListener('wheel', e => {
    if (!e.altKey) return;
    eat(e);
    const d = e.deltaY || e.deltaX;
    moveLayers(0, 0, d * worldPerPixel(selectedLayer) * 0.5, e.shiftKey);
  }, { capture: true, passive: false });

  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    const k = worldPerPixel(selectedLayer);
    if (drag.z) moveLayers(0, 0, dy * k, e.shiftKey);          // arrastrar hacia abajo = alejar
    else moveLayers(dx * k, -dy * k, 0, e.shiftKey);
  });
  const end = () => { drag = null; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('blur', () => { end(); document.body.classList.remove('alt-move'); });

  // cursor de "mover" mientras Alt está pulsada (y evita que Alt abra el menú del navegador en Windows)
  window.addEventListener('keydown', e => { if (e.key === 'Alt') { document.body.classList.add('alt-move'); e.preventDefault(); } });
  window.addEventListener('keyup',   e => { if (e.key === 'Alt') { document.body.classList.remove('alt-move'); e.preventDefault(); } });

  document.getElementById('btn-pos-reset').addEventListener('click', () => resetPosition(true));
}
