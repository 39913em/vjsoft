
'use strict';

let mediaItems = [];      

function mediaKindOf(file) {
  if (/\.glb$/i.test(file.name)) return 'model';
  if (/\.(mp4|webm|ogv|m4v|mov)$/i.test(file.name) || /^video\//.test(file.type)) return 'video';
  return null;
}
function mediaEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function mediaDefine(kind, name, url) {
  const key = kind + ':' + name;
  if (CLIP_DEFS[key]) return null;
  CLIP_DEFS[key] = {
    label: mediaEsc(name.replace(/\.[^.]+$/, '')), tag: kind === 'model' ? '3D' : 'Video',
    head: false, media: true, seed: 4000 + Object.keys(CLIP_DEFS).length,
    build: mats => kind === 'model' ? buildModelClip(url, mats) : buildVideoClip(url, mats)
  };
  return key;
}

function mediaRemoveFromCore(c, key) {
  [c.layerA, c.layerB].forEach(l => {
    if (l.active === key) setActive(l, l === c.layerA ? 'monolith' : 'fondo');
    if (l.prevActive === key) l.prevActive = null;
    const cl = l.clips[key];
    if (cl) { l.root.remove(cl.group); delete l.clips[key]; }
  });
  delete CLIP_DEFS[key];
}

function mediaDB() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('vj-media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'key' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
function mediaDbOp(mode, fn) {
  return mediaDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction('files', mode);
    const rq = fn(tx.objectStore('files'));
    tx.oncomplete = () => res(rq && rq.result);
    tx.onerror = tx.onabort = () => rej(tx.error);
  }));
}

function sendMedia() {
  if (outputWin && !outputWin.closed) {
    outputWin.postMessage({ type: 'media', clips: mediaItems.map(m => ({ key: m.key, kind: m.kind, name: m.name, url: m.url })) }, '*');
  }
}
function mediaUpdateStatus() {
  if (core.headReady) document.getElementById('status').textContent = 'Cabeza 3D cargada · ' + Object.keys(CLIP_DEFS).length + ' clips';
}
function mediaRegister(rec) {
  const url = URL.createObjectURL(rec.blob);
  const key = mediaDefine(rec.kind, rec.name, url);
  if (!key) { URL.revokeObjectURL(url); return null; }
  mediaItems.push({ key: key, kind: rec.kind, name: rec.name, url: url });
  installClip(core, core.layerA, key);
  installClip(core, core.layerB, key);
  addClipButton(key, document.querySelectorAll('.clip').length);
  refreshDeck(); mediaUpdateStatus();
  return key;
}
function mediaRemove(key) {
  const def = CLIP_DEFS[key]; if (!def) return;
  if (!confirm('¿Quitar "' + def.label + '" de la biblioteca?')) return;
  const item = mediaItems.find(m => m.key === key);
  mediaRemoveFromCore(core, key);
  mediaItems = mediaItems.filter(m => m.key !== key);
  if (item) URL.revokeObjectURL(item.url);
  const btn = document.querySelector('.clip[data-clip="' + key.replace(/"/g, '\\"') + '"]');
  if (btn) btn.remove();
  mediaDbOp('readwrite', st => st.delete(key)).catch(() => {});
  sendMedia(); refreshDeck(); mediaUpdateStatus();
}

function initMediaLibrary() {
  const input = document.getElementById('media-file');
  document.getElementById('btn-media-add').addEventListener('click', () => input.click());

  function addFiles(files) {
    const skipped = [];
    let added = 0;
    Array.from(files).forEach(f => {
      const kind = mediaKindOf(f);
      if (!kind) { skipped.push(f.name + ' (formato no admitido)'); return; }
      const rec = { key: kind + ':' + f.name, kind: kind, name: f.name, blob: f };
      if (!mediaRegister(rec)) { skipped.push(f.name + ' (ya existe)'); return; }
      added++;
      mediaDbOp('readwrite', st => st.put(rec)).catch(() => {});
    });
    if (added) sendMedia();
    if (skipped.length) alert('No se añadieron:\n' + skipped.join('\n') + '\n\nAdmitido: .glb y vídeos (.mp4 .webm .ogv .m4v .mov).');
  }
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });

  const hint = document.getElementById('drop-hint');
  let depth = 0;
  const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0;
  window.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; hint.classList.add('show'); } });
  window.addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; hint.classList.remove('show'); } });
  window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', e => {
    if (!hasFiles(e)) return;
    e.preventDefault(); depth = 0; hint.classList.remove('show');
    addFiles(e.dataTransfer.files);
  });

  window.addEventListener('message', e => { if (e.data && e.data.type === 'ready') sendMedia(); });

  mediaDbOp('readonly', st => st.getAll()).then(recs => {
    (recs || []).forEach(r => mediaRegister(r));
    sendMedia();
  }).catch(() => { console.warn('[VJ] No se pudo acceder al almacenamiento del navegador; los medios no se recordarán.'); });
}

function initOutputMedia(core) {
  window.addEventListener('message', e => {
    const d = e.data; if (!d || d.type !== 'media') return;
    const keep = {};
    d.clips.forEach(c => { keep[c.key] = true; });
    mediaItems.filter(m => !keep[m.key]).forEach(m => mediaRemoveFromCore(core, m.key));
    mediaItems = mediaItems.filter(m => keep[m.key]);
    d.clips.forEach(c => {
      if (mediaItems.some(m => m.key === c.key)) return;
      const key = mediaDefine(c.kind, c.name, c.url);
      if (!key) return;
      mediaItems.push(c);
      installClip(core, core.layerA, key);
      installClip(core, core.layerB, key);
    });
  });
}
