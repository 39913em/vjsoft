
'use strict';

let core = null;

function initMain() {
  const viewEl = document.getElementById('view');
  core = buildCore(viewEl);
  installStaticClips(core);
  setActive(core.layerA, 'monolith');
  setActive(core.layerB, 'fondo');

  initCameraControls();
  initDeck();
  buildParamControls();
  buildEffectControls();
  initMasterControls();
  initReactivity();
  initAutoVJ();
  initQualityLink();
  initMediaLibrary();
  initOutputLink();
  initMappingLink();
  initScenes();
  initRotationTools();
  startMainLoop();

  refreshDeck();
  xfVal.textContent = '0%';
}
