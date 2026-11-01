
'use strict';


let _rngState = 1;
function seedRng(s) { _rngState = (s >>> 0) || 1; }
function rng() {
  _rngState ^= _rngState << 13; _rngState >>>= 0;
  _rngState ^= _rngState >>> 17;
  _rngState ^= _rngState << 5;  _rngState >>>= 0;
  return _rngState / 4294967296;
}
function hashRand(i, tq) {
  const s = Math.sin(i * 12.9898 + tq * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
