'use strict';
function buildMonolith(mats) {
  const geo = new THREE.CylinderGeometry(1.2, 1.8, 4.5, 48, 48, true);
  const orig = geo.attributes.position.array.slice();
  const group = wireMesh(geo, mats.occ, mats.primary);
  return { group, update(t, dt, p) {
    const d = p.deform; const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = orig[i], oy = orig[i+1], oz = orig[i+2];
      const wave = Math.sin(oy*3 + t*3)*Math.cos(ox*4 - t*2)*d;
      const tor = Math.sin(t*1.5 + oy*0.8)*(d*0.8);
      pos[i]   = ox*(1+wave) + tor;
      pos[i+2] = oz*(1+wave) - tor;
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.monolith = { label: 'Monolito',   tag: 'Matricial', head: false, build: buildMonolith,    seed: 1006 };
