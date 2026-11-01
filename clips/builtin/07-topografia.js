'use strict';
function buildTopography(mats) {
  const geo = new THREE.PlaneGeometry(6, 6, 64, 64); geo.rotateX(-Math.PI/2.5);
  const orig = geo.attributes.position.array.slice();
  const group = wireMesh(geo, mats.occ, mats.primary);
  return { group, update(t, dt, p) {
    const d = p.deform; const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = orig[i], oy = orig[i+1], oz = orig[i+2];
      pos[i+1] = oy + Math.sin(ox*2 + t*2.5)*Math.cos(oz*2 + t*1.8)*(d*1.8);
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.topography = { label: 'Topografía', tag: 'Armónica',  head: false, build: buildTopography,  seed: 1007 };
