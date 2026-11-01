'use strict';
function buildDisintegrate(mats) {
  const geo = headGeometry.clone();
  const orig = geo.attributes.position.array.slice();
  const mesh = new THREE.Mesh(geo, mats.primary);
  const group = new THREE.Group(); group.add(mesh); group.position.y = -1;
  return { group, update(t) {
    const p = (t * 0.3) % (Math.PI*2);
    const f = (Math.sin(p)*0.5 + 0.5) * 3.5;
    const tq = Math.floor(t * 20);
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = orig[i], y = orig[i+1], z = orig[i+2];
      pos[i]   = x + (x < 0 ? -1 : 1) * f * (hashRand(i, tq) - 0.5) * 2;
      pos[i+1] = y + f * (hashRand(i+1, tq) - 0.5) * 2;
      pos[i+2] = z + f * (hashRand(i+2, tq) - 0.5) * 2;
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.disintegrate = { label: 'Desintegr.', tag: 'Real',      head: true,  build: buildDisintegrate,seed: 1003 };
