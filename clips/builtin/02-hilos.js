'use strict';
function buildScribble(mats) {
  const posAttr = headGeometry.attributes.position; const n = posAttr.count; const pts = [];
  for (let i = 0; i < 3200; i++) {
    const a = Math.floor(rng()*n), b = Math.floor(rng()*n);
    const ax = posAttr.getX(a), ay = posAttr.getY(a), az = posAttr.getZ(a);
    const bx = posAttr.getX(b), by = posAttr.getY(b), bz = posAttr.getZ(b);
    const dx = ax-bx, dy = ay-by, dz = az-bz;
    if (dx*dx+dy*dy+dz*dz < 2.89) pts.push(ax,ay,az,bx,by,bz);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setDrawRange(0, 0);
  const mesh = new THREE.LineSegments(geo, mats.line);
  const group = new THREE.Group(); group.add(mesh); group.position.y = -1;
  const total = pts.length;
  return { group, update(t) {
    const raw = (480*t) % (2*total);
    const count = raw < total ? raw : 2*total - raw;
    geo.setDrawRange(0, Math.floor(count/3));
  }};
}

CLIP_DEFS.scribble = { label: 'Hilos',      tag: 'Tejido',    head: true,  build: buildScribble,    seed: 1002 };
