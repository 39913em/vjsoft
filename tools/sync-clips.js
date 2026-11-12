#!/usr/bin/env node
/* Sincroniza las carpetas de clips con el proyecto (sin dependencias, solo Node).
     clips/custom/*.js      → líneas <script> entre CLIPS:START y CLIPS:END en index.html
     clips/videos/*.{mp4…}  → lista VIDEO_FILES en clips/videos/videos.js
     clips/models/*.glb     → lista MODEL_FILES en clips/models/models.js
     clips/scenes/*.json    → presets de escenas en clips/scenes/scenes.js
   Uso:  node tools/sync-clips.js                                              */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const customDir = path.join(root, 'clips', 'custom');
const videoDir  = path.join(root, 'clips', 'videos');
const indexFile = path.join(root, 'index.html');
const videoList = path.join(videoDir, 'videos.js');
const VIDEO_EXT = /\.(mp4|webm|ogv|m4v)$/i;

// 1) clips JS propios
const customs = fs.readdirSync(customDir)
  .filter(f => f.endsWith('.js') && !f.startsWith('_'))
  .sort();
const block = customs.map(f => '<script src="clips/custom/' + encodeURI(f) + '"></script>').join('\n');

let html = fs.readFileSync(indexFile, 'utf8');
const re = /(<!-- CLIPS:START[^>]*-->)[\s\S]*?(<!-- CLIPS:END -->)/;
if (!re.test(html)) { console.error('No encuentro los marcadores CLIPS:START / CLIPS:END en index.html'); process.exit(1); }
html = html.replace(re, (m, a, b) => a + '\n' + (block ? block + '\n' : '') + b);
fs.writeFileSync(indexFile, html);

// 2) vídeos
const videos = fs.readdirSync(videoDir).filter(f => VIDEO_EXT.test(f)).sort();
const list = videos.map(f => "  '" + f.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "',").join('\n');
fs.writeFileSync(videoList,
  "/* Lista de vídeos del deck. La rellena tools/sync-clips.js (o escríbela a mano).\n" +
  "   Los archivos viven en esta misma carpeta: clips/videos/ */\n" +
  "'use strict';\n\n" +
  "const VIDEO_FILES = [\n" + (list ? list + '\n' : "  // 'mi-video.mp4',\n") + "];\n");

// 3) modelos .glb
const modelDir = path.join(root, 'clips', 'models');
const models = fs.readdirSync(modelDir).filter(f => /\.glb$/i.test(f)).sort();
const mlist = models.map(f => "  '" + f.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "',").join('\n');
fs.writeFileSync(path.join(modelDir, 'models.js'),
  "/* Lista de modelos 3D del deck. La rellena tools/sync-clips.js (o escríbela a mano).\n" +
  "   Los archivos viven en esta misma carpeta: clips/models/ */\n" +
  "'use strict';\n\n" +
  "const MODEL_FILES = [\n" + (mlist ? mlist + '\n' : "  // 'mi-modelo.glb',\n") + "];\n");

// 4) escenas (.json exportadas desde la app)
const sceneDir = path.join(root, 'clips', 'scenes');
const sceneFiles = fs.readdirSync(sceneDir).filter(f => /\.json$/i.test(f)).sort();
const scenes = [];
sceneFiles.forEach(f => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(sceneDir, f), 'utf8'));
    (Array.isArray(j) ? j : (j.scenes ? j.scenes : [j])).forEach(sc => {
      if (sc && sc.active && sc.params) scenes.push(sc);
    });
  } catch (e) { console.warn('Escena ignorada (JSON no válido): ' + f); }
});
fs.writeFileSync(path.join(sceneDir, 'scenes.js'),
  "/* Escenas incluidas con el proyecto. La rellena tools/sync-clips.js\n" +
  "   con los archivos .json de esta carpeta (exporta una escena desde la app y suéltala aquí). */\n" +
  "'use strict';\n\n" +
  "const SCENE_PRESETS = " + JSON.stringify(scenes, null, 1) + ";\n");

console.log('Clips JS propios : ' + customs.length + (customs.length ? '  (' + customs.join(', ') + ')' : ''));
console.log('Clips de vídeo   : ' + videos.length + (videos.length ? '  (' + videos.join(', ') + ')' : ''));
console.log('Modelos .glb      : ' + models.length + (models.length ? '  (' + models.join(', ') + ')' : ''));
console.log('Escenas preset   : ' + scenes.length);
