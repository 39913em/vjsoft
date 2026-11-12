/* ============================================================
   APP · editor de mapping (ventana de salida)
   Superposición para ajustar esquinas, malla y máscara arrastrando puntos.
   Teclas (con la ventana de salida enfocada):
     M editar/ocultar · 1 esquinas · 2 malla · 3 máscara · P patrón de prueba
     R restablecer el modo · + / − densidad de malla · flechas ajuste fino (Mayús ×10)
     Supr borrar punto de máscara · clic derecho: borra punto (máscara) / reinicia punto (malla)
     H ayuda · clic en vacío (modo 3) añade un punto a la máscara
   Usa:      core, MappingPass, mapMakeWarp(), mapResampleGrid()
   Aporta:   initOutputMapping()
   ============================================================ */
'use strict';

function initOutputMapping(core) {
  const mp = core.mapping = new MappingPass(core);
  let mode = 1, sel = -1, dragging = false, help = true;

  const cv = document.createElement('canvas');
  cv.id = 'map-overlay';
  cv.style.cssText = 'position:fixed;inset:0;z-index:50;display:none;cursor:crosshair;touch-action:none';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const size = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };

  function post() {
    if (window.opener) window.opener.postMessage({ type: 'mapping', data: mp.data, edit: mp.edit, pattern: mp.pattern }, '*');
  }
  function commit() { mp.rebuild(); post(); draw(); }
  function showEdit(v) {
    mp.edit = v; mp.refreshActive();
    cv.style.display = v ? 'block' : 'none';
    if (v) { size(); draw(); }
  }

  /* posiciones (0..1) de los puntos manejables del modo actual */
  function pts() {
    const d = mp.data;
    if (mode === 1) return d.corners.map(c => [c[0], c[1]]);
    if (mode === 3) return d.mask.map(c => [c[0], c[1]]);
    const w = mapMakeWarp(d), out = [];
    for (let j = 0; j < d.rows; j++) for (let i = 0; i < d.cols; i++) out.push(w(i / (d.cols - 1), j / (d.rows - 1)));
    return out;
  }
  function nearest(px, py, maxD) {
    let best = -1, bd = maxD;
    pts().forEach((q, i) => { const dd = Math.hypot(q[0] * cv.width - px, q[1] * cv.height - py); if (dd < bd) { bd = dd; best = i; } });
    return best;
  }
  function move(i, x, y) {
    x = Math.min(1.3, Math.max(-0.3, x)); y = Math.min(1.3, Math.max(-0.3, y));
    const d = mp.data;
    if (mode === 1) d.corners[i] = [x, y];
    else if (mode === 3) d.mask[i] = [x, y];
    else {
      const gi = i % d.cols, gj = Math.floor(i / d.cols);
      const base = mapMakeWarp({ corners: d.corners, cols: d.cols, rows: d.rows, grid: null })(gi / (d.cols - 1), gj / (d.rows - 1));
      d.grid[i] = [x - base[0], y - base[1]];
    }
    commit();
  }
  function insertMaskPoint(nx, ny) {
    const m = mp.data.mask;
    if (m.length < 2) { m.push([nx, ny]); return m.length - 1; }
    let bi = 0, bd = Infinity;
    for (let i = 0; i < m.length; i++) {
      const a = m[i], b = m[(i + 1) % m.length], vx = b[0] - a[0], vy = b[1] - a[1];
      const L = vx * vx + vy * vy || 1e-9;
      const t = Math.max(0, Math.min(1, ((nx - a[0]) * vx + (ny - a[1]) * vy) / L));
      const dd = Math.hypot(nx - (a[0] + t * vx), ny - (a[1] + t * vy));
      if (dd < bd) { bd = dd; bi = i; }
    }
    m.splice(bi + 1, 0, [nx, ny]);
    return bi + 1;
  }

  function draw() {
    if (cv.style.display === 'none') return;
    const W = cv.width, H = cv.height, d = mp.data;
    ctx.clearRect(0, 0, W, H);
    const P = a => [a[0] * W, a[1] * H];
    const poly = (arr, close) => { ctx.beginPath(); arr.forEach((q, i) => { const p = P(q); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); if (close) ctx.closePath(); ctx.stroke(); };
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = mode === 1 ? '#22d3ee' : 'rgba(34,211,238,.35)';
    poly(d.corners, true);
    if (mode === 2) {
      const p = pts(); ctx.strokeStyle = '#e879f9';
      for (let j = 0; j < d.rows; j++) poly(p.slice(j * d.cols, (j + 1) * d.cols), false);
      for (let i = 0; i < d.cols; i++) poly(Array.from({ length: d.rows }, (_, j) => p[j * d.cols + i]), false);
    }
    if (mode === 3 || d.mask.length) {
      ctx.strokeStyle = mode === 3 ? '#facc15' : 'rgba(250,204,21,.35)';
      if (d.mask.length > 1) poly(d.mask, true);
      if (mode === 3 && d.mask.length > 2) {
        ctx.fillStyle = 'rgba(250,204,21,.08)'; ctx.beginPath();
        d.mask.forEach((q, i) => { const p = P(q); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.closePath(); ctx.fill();
      }
    }
    pts().forEach((q, i) => {
      const p = P(q), s = i === sel;
      ctx.fillStyle = s ? '#fb923c' : (mode === 1 ? '#22d3ee' : mode === 2 ? '#e879f9' : '#facc15');
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      if (mode === 2) { ctx.beginPath(); ctx.arc(p[0], p[1], s ? 8 : 6, 0, 7); ctx.fill(); ctx.stroke(); }
      else { const r = s ? 8 : 6; ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2); ctx.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2); }
    });
    if (help) {
      const lines = [
        'MAPPING · modo: ' + ['', '1 ESQUINAS', '2 MALLA ' + d.cols + '×' + d.rows, '3 MÁSCARA (' + d.mask.length + ' pts)'][mode] + (mp.pattern ? ' · patrón ON' : ''),
        '1 esquinas · 2 malla · 3 máscara · P patrón · R reinicia modo · +/− densidad',
        'flechas ajuste fino (Mayús ×10) · clic dcho: borra/reinicia punto · M salir · H ayuda'
      ];
      ctx.font = '13px monospace';
      const w = Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 20;
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(10, 10, w, lines.length * 20 + 12);
      ctx.fillStyle = '#e4e4e7';
      lines.forEach((l, i) => ctx.fillText(l, 20, 32 + i * 20));
    }
  }

  cv.addEventListener('click', e => e.stopPropagation());
  cv.addEventListener('dblclick', e => e.stopPropagation());
  cv.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (e.button !== 0) return;
    let i = nearest(e.clientX, e.clientY, 18);
    if (i < 0 && mode === 3) { i = insertMaskPoint(e.clientX / cv.width, e.clientY / cv.height); commit(); }
    sel = i; dragging = i >= 0;
    if (dragging) cv.setPointerCapture(e.pointerId);
    draw();
  });
  cv.addEventListener('pointermove', e => { if (dragging && sel >= 0) move(sel, e.clientX / cv.width, e.clientY / cv.height); });
  cv.addEventListener('pointerup', () => { dragging = false; });
  cv.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const i = nearest(e.clientX, e.clientY, 18); if (i < 0) return;
    if (mode === 3) { mp.data.mask.splice(i, 1); sel = -1; }
    else if (mode === 2) mp.data.grid[i] = [0, 0];
    commit();
  });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, d = mp.data;
    if (k === 'm' || k === 'M') { showEdit(!mp.edit); post(); return; }
    if (!mp.edit) return;
    if (k === '1' || k === '2' || k === '3') { mode = +k; sel = -1; draw(); }
    else if (k === 'p' || k === 'P') { mp.pattern = !mp.pattern; mp.refreshActive(); post(); draw(); }
    else if (k === 'h' || k === 'H') { help = !help; draw(); }
    else if (k === 'r' || k === 'R') {
      const def = mappingDefaults();
      if (mode === 1) d.corners = def.corners;
      else if (mode === 2) d.grid = Array.from({ length: d.cols * d.rows }, () => [0, 0]);
      else d.mask = [];
      sel = -1; commit();
    }
    else if ((k === '+' || k === '=' || k === '-' || k === '_') && mode === 2) {
      const n = Math.min(8, Math.max(2, d.cols + ((k === '+' || k === '=') ? 1 : -1)));
      if (n !== d.cols) { mapResampleGrid(d, n, n); sel = -1; commit(); }
    }
    else if ((k === 'Delete' || k === 'Backspace') && mode === 3 && sel >= 0) { d.mask.splice(sel, 1); sel = -1; commit(); }
    else if (k.indexOf('Arrow') === 0 && sel >= 0) {
      const st = e.shiftKey ? 10 : 1, cur = pts()[sel];
      const dx = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dy = k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0;
      move(sel, cur[0] + dx / cv.width, cur[1] + dy / cv.height);
    } else return;
    e.preventDefault();
  });

  window.addEventListener('resize', () => { size(); draw(); });

  window.addEventListener('message', e => {
    const d = e.data; if (!d || d.type !== 'mapping') return;
    mp.set(d.data, { edit: d.edit, pattern: d.pattern });
    showEdit(!!d.edit);
  });
}
