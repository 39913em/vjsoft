'use strict';
function buildBase(mats) {
  const geo = headGeometry.clone();
  const orig = geo.attributes.position.array.slice();
  const group = wireMesh(geo, mats.occ, mats.primary); group.position.y = -1;
  return { group, update(t, dt, p) { jawUpdate(geo, orig, p.talking, t); }};
}

CLIP_DEFS.base = { label: 'Malla base', tag: 'Limpia',    head: true,  build: buildBase,        seed: 1005 };
