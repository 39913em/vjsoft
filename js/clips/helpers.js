/* ============================================================
   CLIPS · helpers para construir clips
   Malla con oclusión y animación de mandíbula, reutilizados por varios clips.
   Usa:      THREE
   Aporta:   wireMesh(), jawUpdate()
   ============================================================ */
'use strict';

function wireMesh(geo, occMat, wireMat) {
  const g = new THREE.Group();
  const occ = new THREE.Mesh(geo, occMat);
  occ.scale.set(0.995, 0.995, 0.995);
  g.add(occ); g.add(new THREE.Mesh(geo, wireMat));
  return g;
}
function jawUpdate(geo, orig, talking, t) {
  const jaw = talking ? (Math.sin(t * 7.5) * 0.5 + 0.5) * 0.18 : 0;
  const pos = geo.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    const oy = orig[i + 1], oz = orig[i + 2];
    if (oy < -0.2 && oz > 0.1) pos[i + 1] = oy - jaw * Math.abs(oy + 0.2);
    else if (pos[i + 1] !== oy) pos[i + 1] = oy;
  }
  geo.attributes.position.needsUpdate = true;
}
