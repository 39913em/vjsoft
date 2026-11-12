/* ============================================================
   ENGINE · utilidades WebGL
   Creación de ShaderMaterial y opciones de render targets.
   Usa:      VERT (shaders.js)
   ============================================================ */
'use strict';

/* =========================================================
   HELPERS SHADER / RT
   ========================================================= */
function makeShaderMat(frag, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag,
    depthTest: false, depthWrite: false });
}
function rtOpts() {
  return { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
           format: THREE.RGBAFormat, type: THREE.UnsignedByteType };
}
