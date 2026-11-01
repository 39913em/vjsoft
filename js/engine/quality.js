
'use strict';

const QUALITY_MIN = 0.35;       
const QUALITY_AUTO_MIN = 0.6;   

function setRenderScale(core, s) {
  s = Math.max(QUALITY_MIN, Math.min(1, s));
  if (Math.abs(s - core.scale) < 0.001) return;
  core.scale = s;
  onResize(core);
}

function makeQuality(core) {
  const q = { mode: '1', ema: 16.7, fps: 60, last: 0, lastEval: 0, lastUp: 0, ceil: 1, lastCeilRelax: 0 };

  q.setMode = m => {
    q.mode = m;
    if (m !== 'auto') setRenderScale(core, parseFloat(m));
    else { q.ceil = 1; q.lastEval = q.lastUp = performance.now(); }
  };

  q.tick = now => {
    if (!q.last) { q.last = now; return; }
    const dt = now - q.last; q.last = now;
    if (dt > 250) return;                                 
    q.ema += (dt - q.ema) * 0.05;
    q.fps = 1000 / q.ema;
    if (q.mode !== 'auto' || window.VJ_NO_ADAPT) return;
    if (now - q.lastEval < 1500) return;
    q.lastEval = now;
    if (q.ema > 21 && core.scale > QUALITY_AUTO_MIN + 0.001) {   
      q.ceil = core.scale - 0.001;
      setRenderScale(core, Math.max(QUALITY_AUTO_MIN, core.scale * 0.85));
      q.ema = 16.7;                                       
    } else if (q.ema < 17.6 && core.scale < q.ceil && now - q.lastUp > 15000) {
      q.lastUp = now;                                      
      setRenderScale(core, Math.min(q.ceil, core.scale + 0.1));
    }
    if (now - q.lastCeilRelax > 60000) { q.lastCeilRelax = now; q.ceil = Math.min(1, q.ceil + 0.1); }
  };
  return q;
}
