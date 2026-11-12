/* ============================================================
   CLIPS · modelos 3D (.glb)
   Convierte cada archivo de clips/models/ (o añadido desde el deck) en un clip más.
   Usa:      MODEL_FILES (clips/models/models.js), CLIP_DEFS, wireMesh(), makeGLTFLoader()
   Aporta:   buildModelClip()
   ============================================================ */
'use strict';

/* El modelo se dibuja como malla de alambre (igual que los clips de cabeza), centrado y
   escalado a ~5 unidades. Responde a:
     - Color / Opacidad malla / Escala / Giro X-Y-Z → como cualquier clip
     - Pulsar → latido suave de tamaño
     - Textura (.glb) → muestra el modelo con sus materiales y texturas originales, con luz propia
       (Opacidad malla ≥ 0.90 se ve opaco; los metales se ven mates; Deformación no se aplica).
       "Color modelo" recolorea el resultado conservando su luminosidad (blanco/gris = sin tinte).
     - Modelo SIN animación: varias mallas se unen en una y "Deformación" ondula la superficie
     - Modelo CON animación o esqueleto: reproduce la primera animación; su velocidad sigue a
       Velocidad y BPM (Velocidad 0 la congela). "Deformación" no se aplica a estos.
   Admite .glb comprimidos con Draco (necesita internet la primera vez para el decodificador). */
function buildModelClip(src, mats) {
  const group = new THREE.Group();
  group.position.y = -1;

  // El navegador no deja cargar .glb desde file:// (salvo los añadidos con el botón/arrastrando).
  if (location.protocol === 'file:' && src.indexOf('blob:') !== 0) {
    console.warn('[VJ] Los modelos .glb de la carpeta necesitan servidor local; añádelos desde el deck. Mira el README.');
    return { group, update() {} };
  }

  let geo = null, orig = null, ready = false;       // ruta estática (deformación)
  let flat = false, defTick = 0;
  let mixer = null, action = null, wireM = null, lastT = null;   // ruta animada

  // modo con textura: materiales originales + luces propias (solo visibles en ese modo)
  let texOn = false, texList = [], setTextured = () => {};
  const tint = new THREE.Color();
  const lights = new THREE.Group();
  lights.visible = false;
  {
    const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3, 5, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(-4, -2, -3);
    lights.add(new THREE.AmbientLight(0xffffff, 0.85), key, fill);
  }
  group.add(lights);

  /* prepara los materiales originales: sin gestión de color (como el resto de la consola) y sin
     metal puro (no hay mapa de entorno, quedaría negro) */
  function texMaterials(root) {
    const set = new Set();
    root.traverse(c => { if (c.isMesh) [].concat(c.material).forEach(m => set.add(m)); });
    set.forEach(m => {
      ['map', 'emissiveMap'].forEach(k => { if (m[k]) { m[k].encoding = THREE.LinearEncoding; m[k].needsUpdate = true; } });
      if (m.metalness > 0.2) m.metalness = 0.2;
      m.userData.vjT = m.transparent;
      // recoloreado: conserva la luminosidad (detalle/sombras) de la textura y la tiñe del color elegido
      const U = m.userData.vjU = { uVjTint: { value: new THREE.Color(1, 1, 1) }, uVjMix: { value: 0 } };
      m.onBeforeCompile = sh => {
        sh.uniforms.uVjTint = U.uVjTint; sh.uniforms.uVjMix = U.uVjMix;
        sh.fragmentShader = 'uniform vec3 uVjTint; uniform float uVjMix;\n' + sh.fragmentShader.replace('#include <map_fragment>',
          '#include <map_fragment>\n  { float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * uVjTint * 1.25, uVjMix); }');
      };
      m.customProgramCacheKey = () => 'vjtint';
      m.needsUpdate = true;
    });
    return Array.from(set);
  }
  /* centra la escena original y la escala a ~5 unidades */
  function makePivot(root) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const k = 5 / (Math.max(size.x, size.y, size.z) || 1);
    const pivot = new THREE.Group();
    pivot.add(root);
    pivot.scale.setScalar(k);
    pivot.position.copy(ctr).multiplyScalar(-k);
    return pivot;
  }

  function buildStatic(gltf) {
    const parts = [];
    gltf.scene.traverse(c => {
      if (c.isMesh && c.geometry && c.geometry.attributes.position) {
        const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        g.applyMatrix4(c.matrixWorld);
        parts.push(g);
      }
    });
    if (!parts.length) { console.warn('[VJ] ' + src + ': el archivo no contiene mallas.'); return; }

    let total = 0;
    parts.forEach(g => { total += g.attributes.position.count; });
    const pos = new Float32Array(total * 3);
    let o = 0;
    parts.forEach(g => {
      const a = g.attributes.position;
      for (let i = 0; i < a.count; i++) { pos[o++] = a.getX(i); pos[o++] = a.getY(i); pos[o++] = a.getZ(i); }
      g.dispose();
    });

    // centrar en el origen y escalar a ~5 unidades
    let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      mnx = Math.min(mnx, pos[i]);     mxx = Math.max(mxx, pos[i]);
      mny = Math.min(mny, pos[i + 1]); mxy = Math.max(mxy, pos[i + 1]);
      mnz = Math.min(mnz, pos[i + 2]); mxz = Math.max(mxz, pos[i + 2]);
    }
    const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2, cz = (mnz + mxz) / 2;
    const k = 5 / (Math.max(mxx - mnx, mxy - mny, mxz - mnz) || 1);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (pos[i] - cx) * k; pos[i + 1] = (pos[i + 1] - cy) * k; pos[i + 2] = (pos[i + 2] - cz) * k;
    }

    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    orig = pos.slice();
    const wireObj = wireMesh(geo, mats.occ, mats.primary);
    group.add(wireObj);

    // versión con textura: la escena original, intacta
    texList = texMaterials(gltf.scene);
    const texPivot = makePivot(gltf.scene);
    texPivot.visible = false;
    group.add(texPivot);
    setTextured = on => { wireObj.visible = !on; texPivot.visible = on; };
    ready = true;
  }

  function buildAnimated(gltf, hasSkin, hasMorph) {
    const root = gltf.scene;
    // materiales propios (con esqueleto/morph activados) que siguen a los de la capa en update()
    texList = texMaterials(root);
    const origMat = new Map();
    root.traverse(c => { if (c.isMesh) origMat.set(c, c.material); });
    wireM = mats.primary.clone();
    const occM = mats.occ.clone();
    [wireM, occM].forEach(m => { m.skinning = hasSkin; m.morphTargets = hasMorph; });
    occM.polygonOffset = true; occM.polygonOffsetFactor = 1; occM.polygonOffsetUnits = 1;

    const meshes = [], occs = [];
    root.traverse(c => { if (c.isMesh) meshes.push(c); });
    meshes.forEach(m => {
      const occ = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, occM) : new THREE.Mesh(m.geometry, occM);
      if (m.isSkinnedMesh) occ.bind(m.skeleton, m.bindMatrix);
      if (m.morphTargetInfluences) { occ.morphTargetInfluences = m.morphTargetInfluences; occ.morphTargetDictionary = m.morphTargetDictionary; }
      occ.position.copy(m.position); occ.quaternion.copy(m.quaternion); occ.scale.copy(m.scale);
      m.material = wireM;
      m.parent.add(occ);
      occs.push(occ);
    });
    setTextured = on => {
      meshes.forEach(m => { m.material = on ? origMat.get(m) : wireM; });
      occs.forEach(o => { o.visible = !on; });
    };

    group.add(makePivot(root));

    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(root);
      action = mixer.clipAction(gltf.animations[0]);
      action.play();
      group.userData.mixer = mixer;                    // (útil para depurar)
    }
    ready = true;
  }

  makeGLTFLoader().load(src, gltf => {
    gltf.scene.updateMatrixWorld(true);
    let hasMesh = false, hasSkin = false, hasMorph = false;
    gltf.scene.traverse(c => {
      if (!c.isMesh) return;
      hasMesh = true;
      if (c.isSkinnedMesh) hasSkin = true;
      if (c.geometry.morphAttributes && c.geometry.morphAttributes.position) hasMorph = true;
    });
    if (!hasMesh) { console.warn('[VJ] ' + src + ': el archivo no contiene mallas.'); return; }
    if (hasSkin || (gltf.animations && gltf.animations.length)) buildAnimated(gltf, hasSkin, hasMorph);
    else buildStatic(gltf);
    group.traverse(o => { o.frustumCulled = false; });   // los hijos se añaden tras la instalación
  }, undefined, err => console.warn('[VJ] No se pudo cargar ' + src + ' (¿falta el archivo o está dañado?)', err));

  return { group, update(t, dt, p) {
    group.scale.setScalar(p.pulsing ? 1 + Math.sin(t * 3) * 0.05 : 1);
    if (!ready) return;
    const want = !!p.textured;
    if (want !== texOn) { texOn = want; setTextured(want); lights.visible = want; }
    if (texOn) {
      const op = mats.primary.opacity, o = op >= 0.9 ? 1 : op / 0.9;
      tint.set(p.colModel || '#ffffff');
      const mx = Math.max(tint.r, tint.g, tint.b) || 1, sat = (mx - Math.min(tint.r, tint.g, tint.b)) / mx;   // blanco/gris = sin tinte
      texList.forEach(m => {
        m.transparent = m.userData.vjT || o < 0.999; m.opacity = o;
        const u = m.userData.vjU;
        u.uVjTint.value.copy(tint).multiplyScalar(1 / mx); u.uVjMix.value = sat;
      });
    }
    if (wireM) {                                     // ruta animada
      wireM.color.copy(mats.primary.color);
      wireM.opacity = mats.primary.opacity;
      if (mixer) {                                     // t avanza 3 unidades/s a Velocidad 1 y BPM 120
        if (lastT !== null && t > lastT) mixer.update((t - lastT) / 3);
        lastT = t;
      }
      return;
    }
    if (texOn) return;                               // con textura no se deforma
    const amp = p.deform * 0.12, pos = geo.attributes.position.array;
    if (amp < 0.0005) {                              // sin deformación: restaurar una vez y no hacer más
      if (!flat) { pos.set(orig); geo.attributes.position.needsUpdate = true; flat = true; }
      return;
    }
    flat = false;
    if ((defTick++ & 1) === 1) return;               // la ondulación se recalcula a 30 Hz
    for (let i = 0; i < pos.length; i += 3) {
      const w = 1 + amp * Math.sin(orig[i + 1] * 2.2 + t * 2.0);
      pos[i] = orig[i] * w; pos[i + 1] = orig[i + 1]; pos[i + 2] = orig[i + 2] * w;
    }
    geo.attributes.position.needsUpdate = true;
  }};
}

/* Registro automático: un clip por cada archivo listado en MODEL_FILES */
MODEL_FILES.forEach((file, i) => {
  const name = file.replace(/\.[^.]+$/, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const src = 'clips/models/' + encodeURI(file);
  CLIP_DEFS['model:' + file] = {
    label: name, tag: '3D', head: false, build: mats => buildModelClip(src, mats), seed: 3000 + i
  };
});
