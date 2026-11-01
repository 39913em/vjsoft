'use strict';
function buildCatrina(mats) {
  const rightGeo = headGeometry.clone(); const leftGeo = headGeometry.clone();
  const leftOrig = leftGeo.attributes.position.array.slice();
  const posL = leftGeo.attributes.position.array;
  for (let i = 0; i < posL.length; i += 3) {
    const x = posL[i], y = posL[i+1], z = posL[i+2];
    if (x < 0) {
      if (y > 0.1 && y < 0.6 && z > 0.3) posL[i+2] -= 0.35;
      if (y < 0.1 && y > -0.5 && z > 0.2) posL[i] *= 0.82;
    } else posL[i+1] = -100;
  }
  leftGeo.computeVertexNormals();
  const posR = rightGeo.attributes.position.array;
  for (let i = 0; i < posR.length; i += 3) if (posR[i] < 0) posR[i+1] = -100;
  rightGeo.computeVertexNormals();
  const rightOrig = rightGeo.attributes.position.array.slice();
  const group = new THREE.Group();
  group.add(wireMesh(rightGeo, mats.occ, mats.primary));
  group.add(wireMesh(leftGeo, mats.occ, mats.accent));
  for (let i = 0; i < 5; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8 + i*0.15, 4), mats.accent);
    spine.position.set(0, 1.2 + i*0.3, -0.8 + i*0.4); spine.rotation.x = 0.4;
    group.add(spine);
  }
  group.position.y = -1;
  return { group, update(t, dt, p) {
    const pos = leftGeo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = leftOrig[i], oy = leftOrig[i+1];
      if (ox > -0.5 && ox < 0.1) {
        pos[i+1] = oy - Math.max(0, Math.sin(t + oy)*0.05) + Math.sin(t*2 + oy*4)*0.004;
      }
    }
    leftGeo.attributes.position.needsUpdate = true;
    jawUpdate(rightGeo, rightOrig, p.talking, t);
  }};
}

CLIP_DEFS.catrina = { label: 'Catrina',    tag: 'Cera',      head: true,  build: buildCatrina,     seed: 1001 };
