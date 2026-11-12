/* ============================================================
   ENGINE · capas y clips activos
   Instala clips en cada capa y cambia el clip activo.
   Usa:      CLIP_DEFS (clips/registry.js)
   Aporta:   installClip(), setActive(), installStaticClips()
   ============================================================ */
'use strict';

function installClip(core, layer, key) {
  if (layer.clips[key]) return true;
  const def = CLIP_DEFS[key]; if (!def) return false;
  if (def.head && !core.headReady) return false;
  seedRng(def.seed);
  const built = def.build(layer.mats);
  built.group.visible = false;
  built.group.traverse(o => { o.frustumCulled = false; });
  layer.clips[key] = built;
  layer.root.add(built.group);
  return true;
}

function setActive(layer, key) {
  if (!layer.clips[key]) return false;
  if (layer.active && layer.clips[layer.active]) layer.clips[layer.active].group.visible = false;
  layer.active = key;
  layer.clips[key].group.visible = true;
  return true;
}

function installStaticClips(core) {
  Object.keys(CLIP_DEFS).forEach(key => {
    if (!CLIP_DEFS[key].head) {
      installClip(core, core.layerA, key);
      installClip(core, core.layerB, key);
    }
  });
}
