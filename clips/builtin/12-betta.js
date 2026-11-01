'use strict';
function buildPez(mats) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, dpr = 2;

  const debris = [];
  for (let i = 0; i < 160; i++) {
    debris.push({
      x: rng() * W, y: rng() * H,
      r: rng() * 1.4 + 0.15,
      vx: (rng() - 0.5) * 0.12, vy: rng() * 0.1 + 0.005,
      o: rng() * 0.3 + 0.04
    });
  }

  class Spine {
    constructor(len, points) {
      this.len = len; this.n = points; this.pts = [];
      for (let i = 0; i < points; i++) this.pts.push({ x: 0, y: 0, angle: 0 });
    }
    update(x, y, baseAngle, undulation, time) {
      this.pts[0].x = x; this.pts[0].y = y; this.pts[0].angle = baseAngle;
      for (let i = 1; i < this.n; i++) {
        const t = i / this.n;
        const prev = this.pts[i - 1];
        const wave = Math.sin(time * undulation.freq - t * undulation.wavelength) * undulation.amp * Math.pow(t, 1.5);
        const ang = prev.angle + wave * 0.15;
        const seg = this.len / this.n;
        this.pts[i].x = prev.x - Math.cos(ang) * seg;
        this.pts[i].y = prev.y - Math.sin(ang) * seg;
        this.pts[i].angle = ang;
      }
    }
  }

  class RayFinReal {
    constructor(rays, seg, len, fanAngle) {
      this.rays = rays; this.seg = seg; this.len = len; this.fan = fanAngle;
      this.chains = [];
      for (let r = 0; r < rays; r++) {
        const c = [];
        for (let s = 0; s < seg; s++) c.push({ x: 0, y: 0, vx: 0, vy: 0 });
        this.chains.push(c);
      }
    }
    update(baseX, baseY, baseAngle, flow, time, flutter, bend) {
      for (let r = 0; r < this.rays; r++) {
        const chain = this.chains[r];
        const fanT = (r / (this.rays - 1) - 0.5);
        const rayAngle = baseAngle + fanT * this.fan + bend;
        const off = fanT * 6 * dpr;
        chain[0].x = baseX + Math.cos(baseAngle + Math.PI / 2) * off;
        chain[0].y = baseY + Math.sin(baseAngle + Math.PI / 2) * off;
        for (let s = 1; s < this.seg; s++) {
          const p = chain[s], prev = chain[s - 1];
          const rest = this.len / this.seg * (1 + Math.abs(fanT) * 0.15);
          const dx = p.x - prev.x, dy = p.y - prev.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const k = 0.075;
          let fx = -dx / dist * (dist - rest) * k;
          let fy = -dy / dist * (dist - rest) * k;
          const flutterPhase = time * flutter + r * 0.35 + s * 0.55;
          fx += Math.sin(flutterPhase) * 0.62 + flow.x * 0.32 + Math.cos(rayAngle) * -0.08;
          fy += Math.cos(flutterPhase * 0.9) * 0.48 + flow.y * 0.32 + Math.sin(rayAngle) * -0.08;
          fy -= 0.04 * (s / this.seg);
          p.vx = (p.vx + fx) * 0.885;
          p.vy = (p.vy + fy) * 0.885;
          p.x += p.vx; p.y += p.vy;
        }
      }
    }
    draw(edgeCol, memCol) {
      for (let r = 0; r < this.rays - 1; r++) {
        const a = this.chains[r], b = this.chains[r + 1];
        ctx.beginPath();
        for (let s = 0; s < this.seg; s++) ctx.lineTo(a[s].x, a[s].y);
        for (let s = this.seg - 1; s >= 0; s--) ctx.lineTo(b[s].x, b[s].y);
        ctx.closePath();
        const alpha = 0.18 + Math.abs(r - this.rays / 2) / this.rays * 0.2;
        ctx.fillStyle = memCol; ctx.globalAlpha = alpha; ctx.fill();
        ctx.globalAlpha = alpha * 0.35;
        ctx.strokeStyle = edgeCol; ctx.lineWidth = 0.3 * dpr; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = edgeCol; ctx.lineWidth = 1.1 * dpr;
      ctx.globalAlpha = 0.85; ctx.lineCap = 'round';
      for (let r = 0; r < this.rays; r++) {
        const chain = this.chains[r];
        ctx.beginPath(); ctx.moveTo(chain[0].x, chain[0].y);
        for (let s = 1; s < this.seg; s++) {
          const midX = (chain[s].x + chain[s - 1].x) / 2;
          const midY = (chain[s].y + chain[s - 1].y) / 2;
          ctx.quadraticCurveTo(chain[s - 1].x, chain[s - 1].y, midX, midY);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  class BettaReal {
    constructor() {
      this.x = W * 0.45; this.y = H * 0.5;
      this.vx = 0; this.vy = 0; this.angle = 0; this.time = 0;
      this.len = 125 * dpr;
      this.spine = new Spine(this.len * 0.55, 14);
      this.caudal = new RayFinReal(22, 24, 118 * dpr, 1.25);
      this.dorsal = new RayFinReal(12, 18, 52 * dpr, 0.9);
      this.anal = new RayFinReal(18, 20, 78 * dpr, 1.0);
      this.pectL = new RayFinReal(13, 14, 28 * dpr, 0.8);
      this.pectR = new RayFinReal(13, 14, 28 * dpr, 0.8);
      this.ventralL = new RayFinReal(1, 22, 58 * dpr, 0.1);
      this.ventralR = new RayFinReal(1, 22, 56 * dpr, 0.1);
      this.state = 'hover'; this.stateT = 0;
      this.target = { x: W * 0.5, y: H * 0.5 };
      this.pectPhase = 0;
    }
    pickNewTarget() {
      this.target.x = W * (0.2 + rng() * 0.6);
      this.target.y = H * (0.25 + rng() * 0.55);
      this.state = rng() > 0.65 ? 'dart' : 'cruise';
      this.stateT = 0;
    }
    update(dt) {
      this.time += dt; this.stateT += dt;
      if (this.stateT > (this.state === 'hover' ? 1.2 + rng() * 2 : 3 + rng() * 3)) {
        if (this.state === 'hover' || rng() > 0.5) this.pickNewTarget();
        else { this.state = 'hover'; this.stateT = 0; }
      }
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const desiredAngle = Math.atan2(dy, dx);
      const angleDiff = Math.atan2(Math.sin(desiredAngle - this.angle), Math.cos(desiredAngle - this.angle));
      let thrust = 0, undFreq = 0, undAmp = 0, pectSpeed = 0;
      if (this.state === 'hover') {
        thrust = 0.003; undFreq = 0.3; undAmp = 0.08; pectSpeed = 6.5;
        this.angle += angleDiff * 0.02;
        this.vx *= 0.94; this.vy *= 0.94;
        this.vx += (rng() - 0.5) * 0.02;
        this.vy += (rng() - 0.5) * 0.02;
      } else if (this.state === 'cruise') {
        thrust = 0.018; undFreq = 1.1; undAmp = 0.22; pectSpeed = 4.2;
        this.angle += angleDiff * 0.035;
      } else {
        thrust = 0.055; undFreq = 2.4; undAmp = 0.65; pectSpeed = 1.2;
        this.angle += angleDiff * 0.08;
      }
      const ax = Math.cos(this.angle) * thrust, ay = Math.sin(this.angle) * thrust;
      this.vx += ax; this.vy += ay;
      const speed = Math.hypot(this.vx, this.vy);
      const drag = 0.02 + speed * 0.015;
      this.vx *= (1 - drag); this.vy *= (1 - drag);
      this.x += this.vx * dpr * 60 * dt;
      this.y += this.vy * dpr * 60 * dt;
      if (this.x < this.len * 0.6 || this.x > W - this.len * 0.6) this.vx *= -0.6;
      if (this.y < this.len * 0.5 || this.y > H - this.len * 0.5) this.vy *= -0.6;
      this.x = Math.max(this.len * 0.6, Math.min(W - this.len * 0.6, this.x));
      this.y = Math.max(this.len * 0.5, Math.min(H - this.len * 0.5, this.y));
      this.spine.update(this.x, this.y, this.angle, { freq: undFreq, amp: undAmp, wavelength: 3.2 }, this.time);
      this.pectPhase += dt * pectSpeed;
      const flow = { x: -this.vx * 1.3, y: -this.vy * 1.3 };
      const peduncle = this.spine.pts[this.spine.n - 1];
      const midBody = this.spine.pts[5];
      const midBody2 = this.spine.pts[7];
      this.caudal.update(peduncle.x, peduncle.y, peduncle.angle, flow, this.time, 1.0, Math.sin(this.time * undFreq) * 0.35);
      this.dorsal.update(midBody.x, midBody.y - 10 * dpr, midBody.angle, { x: flow.x * 0.5, y: flow.y * 0.5 - 0.15 }, this.time, 1.4, 0);
      this.anal.update(midBody2.x, midBody2.y + 11 * dpr, midBody2.angle, { x: flow.x * 0.5, y: flow.y * 0.5 + 0.15 }, this.time, 1.3, 0);
      const pectAngleL = this.angle + Math.sin(this.pectPhase) * 0.9;
      const pectAngleR = this.angle + Math.sin(this.pectPhase + Math.PI) * 0.9;
      const pBaseX = this.spine.pts[2].x, pBaseY = this.spine.pts[2].y;
      this.pectL.update(pBaseX, pBaseY - 7 * dpr, pectAngleL, flow, this.time, 3.8, 0);
      this.pectR.update(pBaseX, pBaseY + 7 * dpr, pectAngleR, flow, this.time, 3.8, 0);
      this.ventralL.update(this.spine.pts[4].x, this.spine.pts[4].y + 6 * dpr,
        this.angle + Math.PI / 2 + Math.sin(this.time * 1.2) * 0.2,
        { x: flow.x * 0.2, y: flow.y * 0.2 + 0.3 }, this.time, 1.8, 0);
      this.ventralR.update(this.spine.pts[4].x, this.spine.pts[4].y + 8 * dpr,
        this.angle + Math.PI / 2 + Math.sin(this.time * 1.2 + 0.5) * 0.2,
        { x: flow.x * 0.2, y: flow.y * 0.2 + 0.3 }, this.time, 1.8, 0);
    }
    draw() {
      this.ventralL.draw('#152a33', '#5a8aaa');
      this.ventralR.draw('#152a33', '#5a8aaa');
      this.anal.draw('#2a0a0a', '#ff1a1a');
      this.dorsal.draw('#0f2a3a', '#4a9ac4');
      this.caudal.draw('#3a0a0a', '#ff2a2a');
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < this.spine.n; i++) {
        const p = this.spine.pts[i];
        const t = i / this.spine.n;
        const width = this.len * 0.19 * (1 - Math.pow(t, 1.8) * 0.6);
        if (i === 0) ctx.moveTo(p.x + Math.cos(p.angle + Math.PI / 2) * width, p.y + Math.sin(p.angle + Math.PI / 2) * width);
        else ctx.lineTo(p.x + Math.cos(p.angle + Math.PI / 2) * width, p.y + Math.sin(p.angle + Math.PI / 2) * width);
      }
      for (let i = this.spine.n - 1; i >= 0; i--) {
        const p = this.spine.pts[i];
        const t = i / this.spine.n;
        const width = this.len * 0.19 * (1 - Math.pow(t, 1.8) * 0.6) * (i < 2 ? 0.7 : 1);
        ctx.lineTo(p.x + Math.cos(p.angle - Math.PI / 2) * width * 0.85, p.y + Math.sin(p.angle - Math.PI / 2) * width * 0.85);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(
        this.spine.pts[0].x, this.spine.pts[0].y,
        this.spine.pts[this.spine.n - 1].x, this.spine.pts[this.spine.n - 1].y
      );
      grad.addColorStop(0, '#0a1512');
      grad.addColorStop(0.18, '#1b2f28');
      grad.addColorStop(0.45, '#223e36');
      grad.addColorStop(0.7, '#1e3d4e');
      grad.addColorStop(1, '#0e2028');
      ctx.fillStyle = grad; ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 1; i < this.spine.n - 2; i++) {
        const p = this.spine.pts[i];
        for (let s = -1; s <= 1; s++) {
          const sx = p.x + Math.cos(p.angle + Math.PI / 2) * s * 9 * dpr;
          const sy = p.y + Math.sin(p.angle + Math.PI / 2) * s * 9 * dpr;
          const irid = Math.sin(i * 0.7 + s) * 0.5 + 0.5;
          ctx.fillStyle = irid > 0.62 ? 'rgba(110,210,255,0.22)' : 'rgba(200,210,190,0.07)';
          ctx.beginPath();
          ctx.ellipse(sx, sy, 5 * dpr, 3.2 * dpr, p.angle, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.28)';
          ctx.lineWidth = 0.35 * dpr;
          ctx.stroke();
        }
      }
      ctx.restore();
      const head = this.spine.pts[0];
      ctx.translate(head.x, head.y); ctx.rotate(head.angle);
      ctx.strokeStyle = 'rgba(200,40,20,0.55)'; ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath(); ctx.arc(2 * dpr, 0, 9 * dpr, -0.7, 1.1); ctx.stroke();
      ctx.fillStyle = '#050805';
      ctx.beginPath(); ctx.arc(18 * dpr, -2.5 * dpr, 7.8 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d5a6e';
      ctx.beginPath(); ctx.arc(18 * dpr, -2.5 * dpr, 6 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath(); ctx.arc(19 * dpr, -2.5 * dpr, 3.4 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8f8ff'; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(19.8 * dpr, -4.5 * dpr, 1.7 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
      this.pectL.draw('#1a3a4a', '#6ab0c8');
      this.pectR.draw('#1a3a4a', '#6ab0c8');
    }
  }

  const betta = new BettaReal();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  const planeGeo = new THREE.PlaneBufferGeometry(22, 12.375);
  const planeMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(planeGeo, planeMat);
  mesh.position.z = -0.5;

  const group = new THREE.Group();
  group.add(mesh);

  let lastT = performance.now();

  return {
    group,
    update(t, dt) {
      const now = performance.now();
      const dtSim = Math.min((now - lastT) / 1000, 0.033);
      lastT = now;

      ctx.clearRect(0, 0, W, H);

      debris.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y > H) { p.y = -10; p.x = rng() * W; }
        if (p.x < 0 || p.x > W) p.vx *= -1;
        ctx.globalAlpha = p.o;
        ctx.fillStyle = p.r > 0.8 ? '#3e3426' : '#1e2e28';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;

      betta.update(dtSim);
      betta.draw();

      tex.needsUpdate = true;
    }
  };
}

CLIP_DEFS.pez = { label: 'Betta',      tag: 'Pez vivo',  head: false, build: buildPez,         seed: 1012 };
