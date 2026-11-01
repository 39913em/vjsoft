
'use strict';


function lerpColor(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  ca.lerp(cb, t);
  return '#' + ca.getHexString();
}
function lerpVal(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }

function lerpStates(from, to, t) {
  const r = {
    colPrimary: {}, colAccent: {}, colModel: {}, opacity: {}, deform: {}, scale: {}, speed: {}, rotSpeed: {}, rotX: {}, rotZ: {},
    talking: {}, pulsing: {}, textured: {}, effects: {}
  };
  ['A','B'].forEach(L => {
    r.colPrimary[L] = lerpColor(from.colPrimary[L], to.colPrimary[L], t);
    r.colAccent[L]  = lerpColor(from.colAccent[L], to.colAccent[L], t);
    r.colModel[L]   = lerpColor(from.colModel[L], to.colModel[L], t);
    r.opacity[L]    = lerpVal(from.opacity[L], to.opacity[L], t);
    r.deform[L]     = lerpVal(from.deform[L], to.deform[L], t);
    r.scale[L]      = lerpVal(from.scale[L], to.scale[L], t);
    r.speed[L]      = lerpVal(from.speed[L], to.speed[L], t);
    r.rotSpeed[L]   = lerpVal(from.rotSpeed[L], to.rotSpeed[L], t);
    r.rotX[L]       = lerpVal(from.rotX[L], to.rotX[L], t);
    r.rotZ[L]       = lerpVal(from.rotZ[L], to.rotZ[L], t);
    r.talking[L]    = t < 0.5 ? from.talking[L] : to.talking[L];
    r.pulsing[L]    = t < 0.5 ? from.pulsing[L] : to.pulsing[L];
    r.textured[L]   = t < 0.5 ? from.textured[L] : to.textured[L];
  });
  Object.keys(from.effects).forEach(k => {
    r.effects[k] = {
      A: lerpVal(from.effects[k].A, to.effects[k].A, t),
      B: lerpVal(from.effects[k].B, to.effects[k].B, t)
    };
  });
  r.crossfade = lerpVal(from.crossfade, to.crossfade, t);
  r.blend = to.blend;
  r.opA = lerpVal(from.opA, to.opA, t);
  r.opB = lerpVal(from.opB, to.opB, t);
  r.bpm = lerpVal(from.bpm, to.bpm, t);
  r.audioGain = lerpVal(from.audioGain, to.audioGain, t);
  r.videoGain = lerpVal(from.videoGain, to.videoGain, t);
  r.autoRotate = to.autoRotate;
  r._audio = 0; r._motion = 0;
  return r;
}

function flattenSnapshot(s) {
  const p = s.params;
  return {
    colPrimary: p.colPrimary, colAccent: p.colAccent, colModel: p.colModel, opacity: p.opacity, deform: p.deform,
    scale: p.scale, speed: p.speed, rotSpeed: p.rotSpeed, rotX: p.rotX, rotZ: p.rotZ,
    talking: p.talking, pulsing: p.pulsing, textured: p.textured, effects: s.effects,
    crossfade: s.crossfade, blend: s.blend, opA: s.opA, opB: s.opB,
    bpm: s.bpm, audioGain: s.audioGain, videoGain: s.videoGain, autoRotate: s.autoRotate
  };
}
