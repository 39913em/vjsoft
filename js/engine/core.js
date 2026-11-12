/* ============================================================
   ENGINE · núcleo de render
   Renderer, cámara, escenas A/B, render targets, pasadas de composición/FX, y resize.
   Usa:      shaders.js, materials.js, gl-helpers.js
   Aporta:   buildCore(), onResize()
   ============================================================ */
'use strict';

/* =========================================================
   CORE
   ========================================================= */
function buildCore(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: IS_OUTPUT && !!window.VJ_KEEP_BUFFER });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 14);

  const sceneA = new THREE.Scene(); sceneA.background = new THREE.Color(0x000000);
  const sceneB = new THREE.Scene(); sceneB.background = new THREE.Color(0x000000);
  const matsA = makeMats(), matsB = makeMats();

  const layerA = { name: 'A', scene: sceneA, root: new THREE.Group(), clips: {}, active: null,
                   prevActive: null, transition: { start: 0, dur: 0 }, mats: matsA, time: 0 };
  const layerB = { name: 'B', scene: sceneB, root: new THREE.Group(), clips: {}, active: null,
                   prevActive: null, transition: { start: 0, dur: 0 }, mats: matsB, time: 0 };
  sceneA.add(layerA.root); sceneB.add(layerB.root);

  const W = Math.floor(window.innerWidth * dpr);
  const H = Math.floor(window.innerHeight * dpr);

  const rtA = new THREE.WebGLRenderTarget(W, H, rtOpts());
  const rtB = new THREE.WebGLRenderTarget(W, H, rtOpts());
  const rtPrevA = new THREE.WebGLRenderTarget(W, H, rtOpts());
  const rtPrevB = new THREE.WebGLRenderTarget(W, H, rtOpts());
  const rtTempA = new THREE.WebGLRenderTarget(W, H, rtOpts());
  const rtTempB = new THREE.WebGLRenderTarget(W, H, rtOpts());
  let fxFeedA = new THREE.WebGLRenderTarget(W, H, rtOpts());
  let fxBufA  = new THREE.WebGLRenderTarget(W, H, rtOpts());
  let fxFeedB = new THREE.WebGLRenderTarget(W, H, rtOpts());
  let fxBufB  = new THREE.WebGLRenderTarget(W, H, rtOpts());

  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

  const compU = {
    uA: { value: fxBufA.texture }, uB: { value: fxBufB.texture },
    uMix: { value: 0 }, uOpA: { value: 1 }, uOpB: { value: 1 }, uBlend: { value: 1 }
  };
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), makeShaderMat(COMP_FRAG, compU)));

  function newFxU() {
    return {
      uSource: { value: null }, uPrev: { value: null },
      uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(W, H) },
      uRepetition: { value: 0 }, uTunnel: { value: 0 }, uGlitch: { value: 0 },
      uAberration: { value: 0 }, uBorders: { value: 0 }, uFluids: { value: 0 }, uFractal: { value: 0 },
      uPixelate: { value: 0 }, uMirror: { value: 0 }, uZoom: { value: 0 }, uPosterize: { value: 0 },
      uScan: { value: 0 }, uInvert: { value: 0 }, uVignette: { value: 0 }, uGrain: { value: 0 }
    };
  }
  const fxUA = newFxU(), fxUB = newFxU();
  const fxSceneA = new THREE.Scene();
  fxSceneA.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), makeShaderMat(FX_FRAG, fxUA)));
  const fxSceneB = new THREE.Scene();
  fxSceneB.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), makeShaderMat(FX_FRAG, fxUB)));

  const lerpU = { uFrom: { value: null }, uTo: { value: null }, uT: { value: 0 } };
  const lerpScene = new THREE.Scene();
  lerpScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), makeShaderMat(LERP_FRAG, lerpU)));

  renderer.setRenderTarget(fxFeedA); renderer.clear();
  renderer.setRenderTarget(fxFeedB); renderer.clear();
  renderer.setRenderTarget(null);

  return {
    renderer, camera, sceneA, sceneB, layerA, layerB, matsA, matsB,
    rtA, rtB, rtPrevA, rtPrevB, rtTempA, rtTempB,
    fxFeedA, fxBufA, fxFeedB, fxBufB,
    compScene, compU, fxSceneA, fxSceneB, fxUA, fxUB, lerpScene, lerpU,
    orthoCam, W, H, dpr, scale: 1, headReady: false
  };
}

function onResize(core) {
  const w = window.innerWidth, h = window.innerHeight;
  core.camera.aspect = w/h; core.camera.updateProjectionMatrix();
  core.renderer.setPixelRatio(core.dpr * core.scale);
  core.renderer.setSize(w, h);
  const W = Math.floor(w * core.dpr * core.scale), H = Math.floor(h * core.dpr * core.scale);
  [core.rtA, core.rtB, core.rtPrevA, core.rtPrevB, core.rtTempA, core.rtTempB,
   core.fxFeedA, core.fxBufA, core.fxFeedB, core.fxBufB].forEach(rt => rt.setSize(W, H));
  core.W = W; core.H = H;
  core.fxUA.uResolution.value.set(W, H);
  core.fxUB.uResolution.value.set(W, H);
  if (core.mapping) core.mapping.onResize();
}
