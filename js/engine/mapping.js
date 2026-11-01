
'use strict';

function mappingDefaults() {
  const cols = 4, rows = 4, grid = [];
  for (let i = 0; i < cols * rows; i++) grid.push([0, 0]);
  return {
    enabled: false,
    corners: [[0, 0], [1, 0], [1, 1], [0, 1]],   
    cols: cols, rows: rows, grid: grid,          
    mask: [],                                     
    feather: 0.004                                
  };
}

function mapSanitize(d) {
  const def = mappingDefaults();
  if (!d || typeof d !== 'object') return def;
  const out = {
    enabled: !!d.enabled,
    corners: (Array.isArray(d.corners) && d.corners.length === 4 &&
              d.corners.every(c => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1])))
             ? d.corners.map(c => [+c[0], +c[1]]) : def.corners,
    cols: Math.min(8, Math.max(2, d.cols | 0 || 4)),
    rows: Math.min(8, Math.max(2, d.rows | 0 || 4)),
    mask: Array.isArray(d.mask) ? d.mask.filter(c => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1])).map(c => [+c[0], +c[1]]) : [],
    feather: isFinite(d.feather) ? Math.min(0.05, Math.max(0, +d.feather)) : def.feather
  };
  const n = out.cols * out.rows;
  out.grid = (Array.isArray(d.grid) && d.grid.length === n &&
              d.grid.every(c => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1])))
             ? d.grid.map(c => [+c[0], +c[1]]) : Array.from({ length: n }, () => [0, 0]);
  return out;
}

function mapGridOffset(d, u, v) {
  const cols = d.cols, rows = d.rows, g = d.grid;
  const fx = u * (cols - 1), fy = v * (rows - 1);
  const i0 = Math.min(cols - 2, Math.max(0, Math.floor(fx)));
  const j0 = Math.min(rows - 2, Math.max(0, Math.floor(fy)));
  const tx = fx - i0, ty = fy - j0;
  const p00 = g[j0 * cols + i0], p10 = g[j0 * cols + i0 + 1];
  const p01 = g[(j0 + 1) * cols + i0], p11 = g[(j0 + 1) * cols + i0 + 1];
  return [
    (p00[0] * (1 - tx) + p10[0] * tx) * (1 - ty) + (p01[0] * (1 - tx) + p11[0] * tx) * ty,
    (p00[1] * (1 - tx) + p10[1] * tx) * (1 - ty) + (p01[1] * (1 - tx) + p11[1] * tx) * ty
  ];
}


function mapMakeWarp(d) {
  const c = d.corners;
  const x0 = c[0][0], y0 = c[0][1], x1 = c[1][0], y1 = c[1][1];
  const x2 = c[2][0], y2 = c[2][1], x3 = c[3][0], y3 = c[3][1];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, dd, e, g, h;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    g = 0; h = 0; a = x1 - x0; b = x3 - x0; dd = y1 - y0; e = y3 - y0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1; b = x3 - x0 + h * x3;
    dd = y1 - y0 + g * y1; e = y3 - y0 + h * y3;
  }
  return (u, v) => {
    const w = g * u + h * v + 1;
    let x = (a * u + b * v + x0) / w, y = (dd * u + e * v + y0) / w;
    if (d.grid) { const o = mapGridOffset(d, u, v); x += o[0]; y += o[1]; }
    return [x, y];
  };
}

function mapResampleGrid(d, cols, rows) {
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push(mapGridOffset(d, i / (cols - 1), j / (rows - 1)));
  d.cols = cols; d.rows = rows; d.grid = out;
}

class MappingPass {
  constructor(core) {
    this.core = core;
    this.data = mappingDefaults();
    this.edit = false; this.pattern = false; this.active = false;
    this.TX = 32; this.TY = 32;

    this.rt = new THREE.WebGLRenderTarget(core.W, core.H, rtOpts());

    const nv = (this.TX + 1) * (this.TY + 1);
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
    for (let j = 0, k = 0; j <= this.TY; j++) for (let i = 0; i <= this.TX; i++, k++) {
      uv[k * 2] = i / this.TX; uv[k * 2 + 1] = 1 - j / this.TY;
    }
    for (let j = 0; j < this.TY; j++) for (let i = 0; i < this.TX; i++) {
      const a = j * (this.TX + 1) + i, b = a + 1, c = a + (this.TX + 1), d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = 1024; this.maskCanvas.height = 576;
    this.maskTex = new THREE.CanvasTexture(this.maskCanvas);
    this.maskTex.minFilter = THREE.LinearFilter; this.maskTex.magFilter = THREE.LinearFilter;
    this.patternTex = new THREE.CanvasTexture(this.makePattern());
    this.patternTex.minFilter = THREE.LinearFilter;

    this.u = {
      uTex: { value: this.rt.texture }, uMask: { value: this.maskTex },
      uRes: { value: new THREE.Vector2(core.W, core.H) }, uUseMask: { value: 0 }
    };
    const mat = makeShaderMat(MAP_FRAG, this.u);
    mat.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(mesh);
    this.rebuild();
  }

  makePattern() {
    const W = 1280, H = 720, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#3a3a3a'; x.lineWidth = 1;
    for (let i = 0; i <= W; i += 80) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (let j = 0; j <= H; j += 80) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    x.strokeStyle = '#22d3ee'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(W, H); x.moveTo(W, 0); x.lineTo(0, H); x.stroke();
    x.strokeStyle = '#e879f9'; x.beginPath(); x.arc(W / 2, H / 2, H * 0.42, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
    const sq = (px, py, col, t) => { x.fillStyle = col; x.fillRect(px, py, 70, 70); x.fillStyle = '#000'; x.font = 'bold 28px monospace'; x.fillText(t, px + 10, py + 44); };
    sq(14, 14, '#ef4444', 'TL'); sq(W - 84, 14, '#22c55e', 'TR'); sq(W - 84, H - 84, '#3b82f6', 'BR'); sq(14, H - 84, '#eab308', 'BL');
    return c;
  }

  refreshActive() { this.active = this.data.enabled || this.edit || this.pattern; }

  set(data, flags) {
    this.data = mapSanitize(data);
    if (flags) { this.edit = !!flags.edit; this.pattern = !!flags.pattern; }
    this.refreshActive();
    this.rebuild();
  }

  rebuild() {
    const d = this.data, pos = this.geo.attributes.position.array;
    const warp = mapMakeWarp(d);
    for (let j = 0, k = 0; j <= this.TY; j++) for (let i = 0; i <= this.TX; i++, k += 3) {
      const p = warp(i / this.TX, j / this.TY);
      pos[k] = p[0] * 2 - 1; pos[k + 1] = 1 - p[1] * 2; pos[k + 2] = 0;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.drawMask();
  }

  drawMask() {
    const m = this.data.mask, cv = this.maskCanvas, x = cv.getContext('2d');
    x.filter = 'none';
    x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height);
    if (m.length >= 3) {
      x.filter = 'blur(' + Math.round(this.data.feather * cv.width) + 'px)';
      x.fillStyle = '#fff'; x.beginPath();
      m.forEach((p, i) => { const px = p[0] * cv.width, py = p[1] * cv.height; i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.closePath(); x.fill(); x.filter = 'none';
      this.u.uUseMask.value = 1;
    } else this.u.uUseMask.value = 0;
    this.maskTex.needsUpdate = true;
  }

  onResize() { this.rt.setSize(this.core.W, this.core.H); }

  render(compScene) {
    const r = this.core.renderer;
    if (!this.pattern) {
      r.setRenderTarget(this.rt);
      r.render(compScene, this.core.orthoCam);
    }
    r.setRenderTarget(null);
    r.getDrawingBufferSize(this.u.uRes.value);
    this.u.uTex.value = this.pattern ? this.patternTex : this.rt.texture;
    r.render(this.scene, this.core.orthoCam);
  }
}
