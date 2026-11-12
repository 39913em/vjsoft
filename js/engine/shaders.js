/* ============================================================
   ENGINE · shaders GLSL
   Vértice común, composición A/B, efectos y mezcla de transición.
   ============================================================ */
'use strict';

/* =========================================================
   SHADERS
   ========================================================= */
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`;

const COMP_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uA, uB;
  uniform float uMix, uOpA, uOpB;
  uniform int uBlend;
  void main() {
    vec3 a = texture2D(uA, vUv).rgb * uOpA;
    vec3 b = texture2D(uB, vUv).rgb * uOpB;
    vec3 r;
    if (uBlend == 1)      r = 1.0 - (1.0 - a) * (1.0 - b);
    else if (uBlend == 2) r = max(a, b);
    else if (uBlend == 3) {
      vec3 lo = 2.0 * a * b;
      vec3 hi = 1.0 - 2.0 * (1.0 - a) * (1.0 - b);
      r = mix(lo, hi, step(0.5, a));
    }
    else if (uBlend == 4) r = abs(a - b);
    else if (uBlend == 5) r = a + b - 2.0 * a * b;
    else                  r = b;
    // A (0) → mezcla de ambas (0.5) → B (1): en los extremos solo se ve esa capa
    vec3 res = (uBlend == 0) ? mix(a, b, uMix)   // Normal: fundido lineal A→B
             : (uMix < 0.5 ? mix(a, r, uMix * 2.0) : mix(r, b, (uMix - 0.5) * 2.0));
    gl_FragColor = vec4(res, 1.0);
  }
`;

const FX_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uSource, uPrev;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uRepetition, uTunnel, uGlitch, uAberration, uBorders, uFluids, uFractal;
  uniform float uPixelate, uMirror, uZoom, uPosterize, uScan, uInvert, uVignette, uGrain;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
    vec2 u = f*f*(3.-2.*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  vec2 kaleido(vec2 uv, float amt){
    vec2 p = uv - 0.5; float ang = atan(p.y,p.x); float r = length(p);
    float n = 2.0 + floor(amt * 10.0);
    float a = mod(ang, 6.2831853/n) - 3.1415926/n;
    return vec2(cos(a),sin(a)) * r + 0.5;
  }
  vec3 chroma(sampler2D s, vec2 uv, float amt){
    float o = amt * 0.02;
    return vec3(texture2D(s,uv+vec2(o,0.)).r, texture2D(s,uv).g, texture2D(s,uv-vec2(o,0.)).b);
  }
  void main() {
    vec2 uv = vUv;
    if (uFluids > 0.001) {
      vec2 q = uv*3.0 + uTime*0.3;
      uv += (vec2(noise(q + vec2(0.,uTime*0.2)),
                  noise(q + vec2(5.2,1.3) - uTime*0.15)) - 0.5) * uFluids * 0.15;
    }
    if (uMirror > 0.001) {
      uv.x = mix(uv.x, 0.5 - abs(uv.x - 0.5), clamp(uMirror * 2.0, 0.0, 1.0));
      uv.y = mix(uv.y, 0.5 - abs(uv.y - 0.5), clamp(uMirror * 2.0 - 1.0, 0.0, 1.0));
    }
    if (uZoom > 0.001) uv = (uv - 0.5) / (1.0 + uZoom * 0.6 * (0.5 + 0.5 * sin(uTime * 4.0))) + 0.5;
    if (uPixelate > 0.001) {
      float c = exp(mix(log(uResolution.x), log(24.0), uPixelate));
      vec2 cells = vec2(c, c * uResolution.y / uResolution.x);
      uv = (floor(uv * cells) + 0.5) / cells;
    }
    vec2 srcUv = uv;
    if (uRepetition > 0.001) srcUv = kaleido(uv, uRepetition);
    vec3 col = (uAberration > 0.001) ? chroma(uSource, srcUv, uAberration)
                                     : texture2D(uSource, srcUv).rgb;
    if (uTunnel > 0.001) {
      vec2 p = vUv - 0.5; float r = length(p);
      vec2 tUv = p * (1.0 + uTunnel*0.03) / (1.0 + r*uTunnel*0.3) + 0.5;
      col = mix(col, texture2D(uPrev, tUv).rgb, uTunnel*0.7);
    }
    if (uFractal > 0.001) {
      vec2 p = vUv - 0.5;
      vec2 fbUv = p * (0.98 - uFractal*0.02) * (1.0 + 0.01*sin(uTime)) + 0.5;
      col = mix(col, texture2D(uPrev, fbUv).rgb, uFractal);
    }
    if (uBorders > 0.001) {
      vec2 px = 1.0 / uResolution;
      float tl = dot(texture2D(uSource, srcUv + px*vec2(-1.,-1.)).rgb, vec3(.3,.6,.1));
      float tr = dot(texture2D(uSource, srcUv + px*vec2( 1.,-1.)).rgb, vec3(.3,.6,.1));
      float bl = dot(texture2D(uSource, srcUv + px*vec2(-1., 1.)).rgb, vec3(.3,.6,.1));
      float br = dot(texture2D(uSource, srcUv + px*vec2( 1., 1.)).rgb, vec3(.3,.6,.1));
      col += vec3(abs(tl-br) + abs(tr-bl)) * uBorders;
    }
    if (uGlitch > 0.001) {
      float t = floor(uTime*12.0);
      float g = hash(vec2(t, floor(uv.y*40.0)));
      if (g > 0.85) {
        float s = (hash(vec2(t, uv.y)) - 0.5) * 0.1 * uGlitch;
        col.r = texture2D(uSource, srcUv + vec2(s,0.)).r;
        col.b = texture2D(uSource, srcUv - vec2(s,0.)).b;
      }
      col += (hash(uv*1000.0 + uTime) - 0.5) * 0.05 * uGlitch;
    }
    if (uPosterize > 0.001) { float lv = mix(32.0, 3.0, uPosterize); col = floor(col * lv + 0.5) / lv; }
    if (uScan > 0.001) { float s = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.2 + uTime * 6.0); col *= 1.0 - uScan * 0.6 * s; }
    if (uInvert > 0.001) col = mix(col, 1.0 - col, uInvert);
    if (uVignette > 0.001) { float d = length(vUv - 0.5) * 1.4142; col *= 1.0 - uVignette * smoothstep(0.25, 1.0, d); }
    if (uGrain > 0.001) col += (hash(vUv * uResolution + uTime) - 0.5) * 0.5 * uGrain;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const LERP_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uFrom, uTo;
  uniform float uT;
  void main(){ gl_FragColor = mix(texture2D(uFrom, vUv), texture2D(uTo, vUv), uT); }
`;

/* Pasada de mapping: dibuja la imagen final sobre una malla deformada y la recorta con la máscara */
const MAP_FRAG = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex, uMask;
  uniform vec2 uRes;
  uniform float uUseMask;
  void main(){
    vec3 c = texture2D(uTex, vUv).rgb;
    float m = mix(1.0, texture2D(uMask, gl_FragCoord.xy / uRes).r, uUseMask);
    gl_FragColor = vec4(c * m, 1.0);
  }
`;
