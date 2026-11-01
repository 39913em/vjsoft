
'use strict';


const state = {
  scale:     { A: 1,     B: 1 },
  deform:    { A: 0.25,  B: 0.25 },
  speed:     { A: 1,     B: 1 },
  rotSpeed:  { A: 0.005, B: 0.005 },
  rotX:      { A: 0,     B: 0 },
  rotZ:      { A: 0,     B: 0 },
  opacity:   { A: 0.9,   B: 0.9 },
  colPrimary:{ A: '#38bdf8', B: '#38bdf8' },
  colAccent: { A: '#f43f5e', B: '#f43f5e' },
  colModel:  { A: '#ffffff', B: '#ffffff' },
  talking:   { A: false, B: false },
  pulsing:   { A: false, B: false },
  textured:  { A: false, B: false },
  target: {
    scale: 'AB', deform: 'AB', speed: 'AB', rotSpeed: 'AB', rotX: 'AB', rotZ: 'AB', opacity: 'AB',
    colPrimary: 'AB', colAccent: 'AB', colModel: 'AB', talking: 'AB', pulsing: 'AB', textured: 'AB'
  },
  effects: {
    repetition: { A: 0, B: 0 }, tunnel: { A: 0, B: 0 }, glitch: { A: 0, B: 0 },
    aberration: { A: 0, B: 0 }, borders: { A: 0, B: 0 }, fluids: { A: 0, B: 0 }, fractal: { A: 0, B: 0 },
    pixelate: { A: 0, B: 0 }, mirror: { A: 0, B: 0 }, zoom: { A: 0, B: 0 }, posterize: { A: 0, B: 0 },
    scan: { A: 0, B: 0 }, invert: { A: 0, B: 0 }, vignette: { A: 0, B: 0 }, grain: { A: 0, B: 0 }
  },
  targetFx: {
    repetition: 'AB', tunnel: 'AB', glitch: 'AB', aberration: 'AB',
    borders: 'AB', fluids: 'AB', fractal: 'AB',
    pixelate: 'AB', mirror: 'AB', zoom: 'AB', posterize: 'AB', scan: 'AB', invert: 'AB', vignette: 'AB', grain: 'AB'
  },
  crossfade: 0, blend: 'screen', opA: 1, opB: 1, autoRotate: true,
  bpm: 120, audioGain: 1, videoGain: 1, audioOn: false, videoOn: false,
  auto: false, transitionDur: 600
};

function getParam(key) { const t = state.target[key]; return t === 'B' ? state[key].B : state[key].A; }
function setParam(key, val) {
  const t = state.target[key];
  if (t === 'A' || t === 'AB') state[key].A = val;
  if (t === 'B' || t === 'AB') state[key].B = val;
}
function getFx(key) { const t = state.targetFx[key]; return t === 'B' ? state.effects[key].B : state.effects[key].A; }
function setFx(key, val) {
  const t = state.targetFx[key];
  if (t === 'A' || t === 'AB') state.effects[key].A = val;
  if (t === 'B' || t === 'AB') state.effects[key].B = val;
}
