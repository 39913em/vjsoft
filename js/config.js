/* ============================================================
   CONFIG · constantes globales
   Detecta si esta ventana es la pantalla de salida y fija la URL del modelo 3D.
   ============================================================ */
'use strict';

const IS_OUTPUT = window.name === 'vjout';
const HEAD_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';

// Decodificador Draco (para .glb comprimidos)
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.4.1/';
