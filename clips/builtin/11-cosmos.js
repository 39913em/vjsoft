'use strict';
function buildFondo(mats) {
  const group = new THREE.Group();
  group.scale.setScalar(0.35);
  const sunGroup = new THREE.Group();
  group.add(sunGroup);

  const coreGeo = new THREE.SphereGeometry(1.3, 32, 24);
  sunGroup.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: 0xffdd77, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
  })));
  const edges = new THREE.EdgesGeometry(coreGeo, 25);
  sunGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
    color: 0xffaa33, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false
  })));
  sunGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.7, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
  ));

  const cpos = [];
  for (let i = 0; i < 1000; i++) {
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    const r = 1.4 + rng() * 0.9;
    cpos.push(Math.sin(ph) * Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r, Math.cos(ph) * r);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
  sunGroup.add(new THREE.Points(cg, new THREE.PointsMaterial({
    color: 0xffaa44, size: 0.07, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false
  })));

  const spos = [], scol = [];
  for (let i = 0; i < 5000; i++) {
    const r = 70 + rng() * 180;
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    spos.push(Math.sin(ph) * Math.cos(th) * r, Math.sin(ph) * Math.sin(th) * r * 0.7, Math.cos(ph) * r);
    const c = new THREE.Color().setHSL(0.55 + rng() * 0.2, 0.6, 0.65 + rng() * 0.35);
    scol.push(c.r, c.g, c.b);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
  const galaxyStars = new THREE.Points(sg, new THREE.PointsMaterial({
    size: 1.1, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  group.add(galaxyStars);

  const npos = [], ncol = [];
  for (let i = 0; i < 4000; i++) {
    const arm = Math.floor(rng() * 2);
    const t = rng();
    const r = 6 + t * 50;
    const th = arm * Math.PI + t * Math.PI * 1.6 + rng() * 0.6;
    const spread = 2 + t * 4;
    npos.push(
      Math.cos(th) * r + (rng() - 0.5) * spread,
      (rng() - 0.5) * spread * 0.4,
      Math.sin(th) * r + (rng() - 0.5) * spread
    );
    const c = new THREE.Color().setHSL(0.55 + rng() * 0.15 + (arm ? 0.15 : 0), 0.8, 0.35 + rng() * 0.3);
    ncol.push(c.r, c.g, c.b);
  }
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.Float32BufferAttribute(npos, 3));
  ng.setAttribute('color', new THREE.Float32BufferAttribute(ncol, 3));
  const galaxyNebula = new THREE.Points(ng, new THREE.PointsMaterial({
    size: 0.45, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  group.add(galaxyNebula);

  const bpos = [], bcol = [];
  for (let i = 0; i < 2500; i++) {
    const a = rng() * Math.PI * 2;
    const r = 8.4 + (rng() - 0.5) * 0.8;
    bpos.push(Math.cos(a) * r, (rng() - 0.5) * 0.2, Math.sin(a) * r);
    const c = new THREE.Color().setHSL(0.08, 0.7, 0.55 + rng() * 0.3);
    bcol.push(c.r, c.g, c.b);
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(bcol, 3));
  const belt = new THREE.Points(bg, new THREE.PointsMaterial({
    size: 0.08, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  group.add(belt);

  const orbitRings = new THREE.Group();
  orbitRings.rotation.x = 0.3;
  orbitRings.rotation.z = 0.15;
  group.add(orbitRings);

  const orbitRadii = [4.5, 7.0, 10.0, 13.5, 17.5, 21.0, 24.5, 28.0, 31.5];
  const orbitColors = [0xf43f5e, 0x7fe8ff, 0xffffff, 0xf59e0b, 0xa7f3ce, 0x38bdf8, 0xa855f7, 0xec4899, 0x10b981];
  orbitRadii.forEach((r, i) => {
    const ringGeo = new THREE.RingGeometry(r - 0.015, r + 0.015, 180);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: orbitColors[i], transparent: true, opacity: 0.18, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    orbitRings.add(ring);
  });

  return {
    group,
    update(t, dt) {
      belt.rotation.y += dt * 0.006;
      galaxyStars.rotation.y += dt * 0.0015;
      galaxyNebula.rotation.y += dt * 0.0024;
      const pulse = 1 + Math.sin(t * 0.8) * 0.05;
      sunGroup.scale.setScalar(pulse);
    }
  };
}

CLIP_DEFS.fondo = { label: 'Cosmos',     tag: 'Galaxia',   head: false, build: buildFondo,       seed: 1011 };
