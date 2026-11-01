
'use strict';

let xfEl = null, xfVal = null;

function initMasterControls() {
  xfEl = document.getElementById('crossfade');
  xfVal = document.getElementById('xf-val');
  xfEl.addEventListener('input', e => {
    state.crossfade = parseFloat(e.target.value);
    autoNudgeXf(state.crossfade);
    xfVal.textContent = Math.round(state.crossfade * 100) + '%';
  });
  document.getElementById('opA').addEventListener('input', e => state.opA = parseFloat(e.target.value));
  document.getElementById('opB').addEventListener('input', e => state.opB = parseFloat(e.target.value));
  document.getElementById('blend').addEventListener('change', e => state.blend = e.target.value);
  document.getElementById('autorot').addEventListener('change', e => state.autoRotate = e.target.checked);
  document.getElementById('transitionDur').addEventListener('input', e => {
    state.transitionDur = parseInt(e.target.value);
    document.getElementById('td-val').textContent = state.transitionDur + 'ms';
  });

  const bpmEl = document.getElementById('bpm'); const bpmVal = document.getElementById('bpm-val');
  bpmEl.addEventListener('input', e => { state.bpm = parseInt(e.target.value); bpmVal.textContent = state.bpm; });

  const agEl = document.getElementById('audioGain'); const agVal = document.getElementById('ag-val');
  agEl.addEventListener('input', e => { state.audioGain = parseFloat(e.target.value); agVal.textContent = state.audioGain.toFixed(1); });
  const vgEl = document.getElementById('videoGain'); const vgVal = document.getElementById('vg-val');
  vgEl.addEventListener('input', e => { state.videoGain = parseFloat(e.target.value); vgVal.textContent = state.videoGain.toFixed(1); });
}
