'use strict';
function buildSphereField(mats) {
  const geo = new THREE.IcosahedronGeometry(2.0, 4);
  const orig = geo.attributes.position.array.slice();
  const group = wireMesh(geo, mats.occ, mats.primary);
  return { group, update(t, dt, p) {
    const d = p.deform; const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = orig[i], oy = orig[i+1], oz = orig[i+2];
      const df = Math.sin(ox*3 + t*3)*Math.sin(oz*3 + t*3)*d;
      pos[i]   = ox*(1+df);
      pos[i+1] = oy*(1+df);
      pos[i+2] = oz*(1+df);
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.sphereField = { label: 'Esfera',     tag: 'Volum.',    head: false, build: buildSphereField, seed: 1009 };
