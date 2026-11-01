
'use strict';


let headGeometry = null;
function fallbackHeadGeometry() {
  const g = new THREE.SphereGeometry(1, 44, 44);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y *= 1.18; x *= 0.88; z *= 0.95;
    if (y < -0.25) z += (-y - 0.25) * 0.55;
    if (y > 0.3)  z -= (y - 0.3) * 0.25;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

let _dracoLoader = null;
function makeGLTFLoader() {
  const l = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    if (!_dracoLoader) { _dracoLoader = new THREE.DRACOLoader(); _dracoLoader.setDecoderPath(DRACO_PATH); }
    l.setDRACOLoader(_dracoLoader);
  }
  return l;
}

function loadHead(core, onReady) {
  makeGLTFLoader().load(HEAD_URL, gltf => {
    let best = null;
    gltf.scene.traverse(c => {
      if (!c.isMesh) return;
      const n = (c.name || '').toLowerCase();
      if (n.includes('eye') || n.includes('teeth')) return;
      if (!best || c.geometry.attributes.position.count > best.geometry.attributes.position.count) best = c;
    });
    headGeometry = best ? best.geometry.clone() : fallbackHeadGeometry();
    core.headReady = true; onReady();
  }, undefined, () => {
    headGeometry = fallbackHeadGeometry();
    core.headReady = true; onReady();
  });
}
