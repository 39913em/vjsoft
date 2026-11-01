
'use strict';


function makeMats() {
  return {
    primary: new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.9 }),
    accent:  new THREE.MeshBasicMaterial({ color: 0xf43f5e, wireframe: true, transparent: true, opacity: 0.9 }),
    line:    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 }),
    occ:     new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
  };
}
function applyMatsToLayer(mats, p) {
  mats.primary.color.set(p.colPrimary);
  mats.accent.color.set(p.colAccent);
  mats.primary.opacity = p.opacity;
  mats.accent.opacity = p.opacity;
  mats.line.color.set(p.colPrimary);
  mats.line.opacity = p.opacity;
}
