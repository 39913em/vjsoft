'use strict';
function buildBiometric(mats) {
  const positions = [], indices = [];
  const CORE = 150;
  for (let i = 0; i < CORE; i++) {
    const t = i/(CORE-1);
    positions.push(Math.sin(t*Math.PI*2)*0.8, (t-0.5)*6, Math.cos(t*Math.PI)*0.5);
  }
  for (let i = 0; i < CORE-1; i++) indices.push(i, i+1);
  for (let i = 0; i < CORE; i++) {
    const px = positions[i*3], py = positions[i*3+1], pz = positions[i*3+2];
    [-1, 1].forEach(side => {
      const len = 1.8 + rng()*1.8;
      const bx = px + side*len, by = py + (rng()-0.5)*1.2, bz = pz + (rng()-0.5)*1.8;
      positions.push(bx, by, bz); const bi = positions.length/3 - 1;
      indices.push(i, bi);
      positions.push(bx + side*(0.5+rng()*0.8), by + (rng()-0.5)*0.8, bz + (rng()-0.5)*0.8);
      indices.push(bi, positions.length/3 - 1);
    });
  }
  const posArr = new Float32Array(positions);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setIndex(indices);
  const mesh = new THREE.LineSegments(geo, mats.line);
  const group = new THREE.Group(); group.add(mesh);
  const orig = posArr.slice();
  return { group, update(t, dt, p) {
    const pulse = p.pulsing ? Math.sin(t*3)*0.15 : Math.sin(t)*0.03;
    const arr = geo.attributes.position.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i]   = orig[i]*(1+pulse);
      arr[i+1] = orig[i+1] + (p.pulsing ? Math.sin(t*4 + i)*0.03 : 0);
      arr[i+2] = orig[i+2]*(1+pulse*0.5);
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

CLIP_DEFS.biometric = { label: 'Biométrica', tag: 'Criptozoo', head: false, build: buildBiometric,   seed: 1010 };
