
'use strict';


function makeShaderMat(frag, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag,
    depthTest: false, depthWrite: false });
}
function rtOpts() {
  return { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
           format: THREE.RGBAFormat, type: THREE.UnsignedByteType };
}
