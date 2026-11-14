/* ============================================================
   CONFIG · constantes globales
   Detecta si esta ventana es la pantalla de salida y fija la URL del modelo 3D.
   ============================================================ */
'use strict';

const IS_OUTPUT = window.name === 'vjout';
const HEAD_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';

// Decodificador Draco (para .glb comprimidos)
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.4.1/';

// Tope de densidad de píxeles (DPR) del renderer, por ventana (cada una tiene el suyo).
// La salida es lo que se proyecta, así que admite más; la vista previa es solo monitor.
// Más DPR = texturas más nítidas pero más memoria y GPU (hay ~10 buffers a pantalla completa).
const MAX_DPR_PREVIEW = 1.5;
const MAX_DPR_OUTPUT  = 2;
