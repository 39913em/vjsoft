/* ============================================================
   CLIPS · helpers para construir clips
   Malla con oclusión y animación de mandíbula, reutilizados por varios clips, más
   utilidades de textura (calidad) y de liberación de memoria (dispose).
   Usa:      THREE, window.VJ_MAX_ANISO (core.js)
   Aporta:   wireMesh(), jawUpdate(), vjTuneTexture(), vjDisposeObject(), vjDisposeMaterial()
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

/* =========================================================
   TEXTURAS · calidad
   Anisotropía al máximo de la GPU y mipmaps trilineales (se ven nítidas en ángulos rasantes
   y sin brillo/ruido al alejarse). Respeta los filtros "Nearest" que el modelo pida a propósito.
   (En WebGL2 las texturas no potencia de 2 ya generan mipmaps sin reescalar.)
   ========================================================= */
function vjTuneTexture(tex) {
  if (!tex || !tex.isTexture || tex.isVideoTexture || tex.isCompressedTexture || tex.isCubeTexture) return;
  let changed = false;
  const maxA = window.VJ_MAX_ANISO || 1;
  if (tex.anisotropy !== maxA) { tex.anisotropy = maxA; changed = true; }
  if (tex.minFilter === THREE.LinearFilter || tex.minFilter === THREE.LinearMipmapNearestFilter) {
    tex.minFilter = THREE.LinearMipmapLinearFilter; changed = true;
  }
  const mip = tex.minFilter === THREE.LinearMipmapLinearFilter || tex.minFilter === THREE.LinearMipmapNearestFilter ||
              tex.minFilter === THREE.NearestMipmapLinearFilter || tex.minFilter === THREE.NearestMipmapNearestFilter;
  if (mip && !tex.generateMipmaps) { tex.generateMipmaps = true; changed = true; }
  if (changed) tex.needsUpdate = true;
}

/* =========================================================
   LIBERACIÓN DE MEMORIA
   Three.js no libera GPU solo: hay que llamar a dispose() en geometrías, materiales y texturas.
   Los materiales de la capa (mats.primary/accent/line/occ) son COMPARTIDOS: nunca se liberan aquí.
   ========================================================= */
function vjDisposeTexture(tex) {
  if (!tex || !tex.isTexture) return;
  tex.dispose();
  const img = tex.image;
  if (img && typeof img.close === 'function') { try { img.close(); } catch (e) {} }   // ImageBitmap: libera la copia en RAM
}
function vjDisposeMaterial(m, keep) {
  if (!m || (keep && keep.has(m))) return;
  for (const k in m) { const v = m[k]; if (v && v.isTexture) vjDisposeTexture(v); }
  m.dispose();
}
/* root: Object3D a liberar · layerMats: mats de la capa (se respetan) · extraMats: materiales propios
   del clip que ya no cuelgan de ninguna malla (p. ej. los originales mientras se ve la malla de alambre) */
function vjDisposeObject(root, layerMats, extraMats) {
  const keep = new Set(layerMats ? Object.keys(layerMats).map(k => layerMats[k]) : []);
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
    if (o.material) [].concat(o.material).forEach(m => vjDisposeMaterial(m, keep));
  });
  (extraMats || []).forEach(m => vjDisposeMaterial(m, keep));
}
