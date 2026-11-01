'use strict';
function buildTorusKnot(mats) {
  const geo = new THREE.TorusKnotGeometry(1.5, 0.4, 128, 32);
  const orig = geo.attributes.position.array.slice();
  const group = wireMesh(geo, mats.occ, mats.primary);
  return { group, update(t, dt, p) {
    const d = p.deform; const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = orig[i], oy = orig[i+1], oz = orig[i+2];
      const pulse = Math.sin(t*4 + ox*2)*d;
      pos[i]   = ox*(1+pulse);
      pos[i+1] = oy*(1+pulse);
      pos[i+2] = oz*(1+pulse);
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.torusKnot = { label: 'Nudo',       tag: 'Pulsante',  head: false, build: buildTorusKnot,   seed: 1008 };
