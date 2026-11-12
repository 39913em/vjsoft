/* ============================================================
   APP · control de cámara
   Órbita con el ratón y zoom con botón derecho.
   Usa:      core (app/main.js)
   Aporta:   initCameraControls(), controls
   ============================================================ */
'use strict';

let controls = null;

function initCameraControls() {
  controls = new THREE.OrbitControls(core.camera, core.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4;
  controls.maxDistance = 45;
  controls.enablePan = false;
  controls.zoomSpeed = 3;

  let rightDrag = false, lastY = 0;
  core.renderer.domElement.addEventListener('mousedown', e => {
    if (e.button === 2) { rightDrag = true; lastY = e.clientY; e.preventDefault(); }
  });
  core.renderer.domElement.addEventListener('mousemove', e => {
    if (!rightDrag) return;
    const dy = e.clientY - lastY; lastY = e.clientY;
    const dir = new THREE.Vector3();
    core.camera.getWorldDirection(dir);
    core.camera.position.addScaledVector(dir, -dy * 0.15);
    const d = core.camera.position.length();
    if (d < 4) core.camera.position.multiplyScalar(4/d);
    if (d > 45) core.camera.position.multiplyScalar(45/d);
  });
  core.renderer.domElement.addEventListener('mouseup', e => { if (e.button === 2) rightDrag = false; });
  core.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
}
