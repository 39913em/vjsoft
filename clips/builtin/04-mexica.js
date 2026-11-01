'use strict';
function buildMexica(mats) {
  const geo = headGeometry.clone();
  const orig = geo.attributes.position.array.slice();
  const group = new THREE.Group();
  group.add(wireMesh(geo, mats.occ, mats.primary));
  const gold = mats.accent;
  const hb = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.45, 0.35, 24, 1, true, -Math.PI/2.2, Math.PI/1.1), gold);
  hb.position.set(0, 1.25, 0.2); hb.rotation.x = 0.2; group.add(hb);
  for (let i = 0; i < 16; i++) {
    const a = (i/15 - 0.5)*Math.PI*0.8;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.15, 2.6, 4), gold);
    f.position.set(Math.sin(a)*1.5, 1.7 + Math.cos(a)*1.3, -0.2);
    f.rotation.z = -a; f.rotation.x = -0.15; group.add(f);
  }
  const sep = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), gold);
  sep.position.set(0, 0.15, 0.95); group.add(sep);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 0.6, 16, 2, true), gold);
  col.position.set(0, -1.2, 0); group.add(col);
  group.position.y = -1;
  return { group, update(t, dt, p) { jawUpdate(geo, orig, p.talking, t); }};
}

CLIP_DEFS.mexica = { label: 'Mexica',     tag: 'Imperial',  head: true,  build: buildMexica,      seed: 1004 };
