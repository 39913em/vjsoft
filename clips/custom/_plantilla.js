
(function () {
  'use strict';

  function buildMiClip(mats) {
    const group = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(2, 3);
    const orig = geo.attributes.position.array.slice();
    group.add(new THREE.Mesh(geo, mats.primary));
    group.position.y = -1;
    return {
      group,
      update(t, dt, p) {
        const amp = 1 + Math.sin(t*2) * 0.15 * (0.3+p.deform);
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i]   = orig[i]   * amp;
          pos[i+1] = orig[i+1] * amp;
          pos[i+2] = orig[i+2] * amp;
        }
        geo.attributes.position.needsUpdate = true;
      }
    };
  }

  CLIP_DEFS.miClip = { label: 'Mi Clip', tag: 'Nuevo', head: false, build: buildMiClip, seed: 1013 };
})();
