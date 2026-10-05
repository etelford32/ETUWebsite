/**
 * ETU 2175 Title Typography — GLSL (WebGL 1 / GLSL ES 1.00).
 *
 * One full-screen quad per title. Everything is procedural except the
 * glyph mask texture built in glyphMask.ts:
 *   R = sharp glyph coverage (front face)
 *   G = narrow blur of the glyphs (height field for the chamfered bevel)
 *   B = wide blur of the glyphs (outer energy halo + sparkle field)
 *
 * Look (see public/brand/etu-title-typography.webp):
 *   - heavy squared letterforms, extruded down-right as dark metal walls
 *   - faces tiled with irregular cells: patches of silver plating and
 *     exposed cyan crystal whose seams glow
 *   - silver chamfer around each glyph with a thin cyan inner rim
 *   - cyan halo + twinkling star sparkles around the letters
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y; // y grows downward, matching the 2D mask canvas
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMask;
uniform vec2  uRes;        // canvas size, device px
uniform float uScale;      // device pixel ratio
uniform float uTime;       // seconds
uniform float uReveal;     // intro progress: 0 = empty, >= 1.4 = settled
uniform float uCell;       // tile size, device px
uniform float uDepth;      // extrusion length, device px
uniform vec2  uExtrudeDir; // normalized, y down
uniform vec4  uTextBox;    // minX, minY, maxX, maxY of the glyphs, device px
uniform vec3  uAccent;     // energy colour (official: cyan #22d3ee)
uniform float uEnergy;     // glow intensity multiplier
uniform float uCrystal;    // 0..1 share of the face that is exposed crystal
uniform vec3  uPointer;    // xy = device px, z = strength 0..1

const int EXTRUDE_STEPS = 14;

float hash1(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  float n = hash1(p);
  return vec2(n, hash1(p + n + 17.17));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash1(i);
  float b = hash1(i + vec2(1.0, 0.0));
  float c = hash1(i + vec2(0.0, 1.0));
  float d = hash1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// x = distance to nearest seed, y = F2 - F1 (0 on seams), zw = cell id
vec4 voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = 0.15 + 0.7 * hash2(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = n + g; }
      else if (d < d2) { d2 = d; }
    }
  }
  d1 = sqrt(d1);
  return vec4(d1, sqrt(d2) - d1, id);
}

vec3 mask(vec2 px) {
  return texture2D(uMask, px / uRes).rgb;
}

// 0..1 horizontal position inside the text block
float textX(vec2 px) {
  return clamp((px.x - uTextBox.x) / max(uTextBox.z - uTextBox.x, 1.0), 0.0, 1.0);
}

// Intro: each tile has a moment it locks into place (left -> right, jittered).
float lockTime(vec2 px, float rnd) { return textX(px) * 0.72 + rnd * 0.28; }
float revealed(float t) { return smoothstep(t, t + 0.12, uReveal); }
float flash(float t) {
  return smoothstep(t, t + 0.04, uReveal) * (1.0 - smoothstep(t + 0.04, t + 0.38, uReveal));
}

void main() {
  vec2 px = vUv * uRes;
  vec3 m = mask(px);
  float cover = m.r;
  float height = m.g;
  float halo = m.b;

  // ---------------------------------------------------------------- tiles
  vec4 v = voronoi(px / uCell);
  vec2 cid = v.zw;
  float rnd = hash1(cid + 3.7);
  float tLock = lockTime((cid + 0.5) * uCell, rnd);
  float cellVis = revealed(tLock);
  float cellFlash = flash(tLock);

  // Plating vs crystal: low-frequency noise sampled per cell, so whole
  // tiles flip together. A slow per-cell breath lets crystal creep.
  float patchN = vnoise(cid * 0.22 + vec2(7.3, 1.9)) * 0.7 + vnoise(cid * 0.61 + 11.0) * 0.3;
  patchN += 0.05 * sin(uTime * 0.35 + rnd * 6.2831);
  float crystal = 1.0 - smoothstep(-0.03, 0.03, (1.0 - uCrystal) - patchN);

  float seam = smoothstep(0.015, 0.09, v.y);   // 0 on tile seams
  float pillow = 1.0 - smoothstep(0.0, 0.78, v.x);

  // Silver plating
  vec3 silver = vec3(0.50 + 0.32 * rnd) * (0.70 + 0.42 * pillow);
  silver *= vec3(0.95, 0.98, 1.03);
  silver *= mix(0.22, 1.0, seam);

  // Exposed crystal: deep blue-teal glass with light running in the seams
  float deep = hash1(cid + 9.1);
  vec3 glass = mix(vec3(0.0, 0.03, 0.09), vec3(0.02, 0.19, 0.31), deep);
  float seamGlow = exp(-v.y * 16.0);
  float flicker = pow(0.5 + 0.5 * sin(uTime * 1.3 + rnd * 40.0), 14.0);
  float wavePos = fract(uTime * 0.11) * 1.7 - 0.35;
  float wave = exp(-pow((textX(px) - wavePos) * 7.0, 2.0));
  vec3 crystalCol = glass
    + uAccent * uEnergy * (seamGlow * 0.95 + flicker * 0.55 + wave * 0.45)
    + uAccent * 0.08 * (1.0 - v.x);

  // Cursor charge
  float pd = length(px - uPointer.xy) / (uCell * 6.0);
  float charge = uPointer.z * exp(-pd * pd);
  crystalCol += uAccent * charge * 1.1;
  silver += vec3(0.22) * charge;

  vec3 face = mix(silver, crystalCol, crystal);

  // ---------------------------------------------------------------- bevel
  float e = 1.5 * uScale;
  float hx = mask(px + vec2(e, 0.0)).g - mask(px - vec2(e, 0.0)).g;
  float hy = mask(px + vec2(0.0, e)).g - mask(px - vec2(0.0, e)).g;
  vec3 N = normalize(vec3(-hx, -hy, 0.32));
  vec3 L = normalize(vec3(-0.55, -0.75, 0.9));
  float lambert = clamp(dot(N, L), 0.0, 1.0);
  float spec = pow(max(reflect(-L, N).z, 0.0), 24.0);
  float bevelBand = 1.0 - smoothstep(0.56, 0.9, height);
  vec3 bevelCol = vec3(0.60, 0.64, 0.70) * (0.18 + 1.05 * lambert) + spec * 0.75;
  face = mix(face, bevelCol, bevelBand * 0.88);

  // Thin cyan inner rim just inside the chamfer
  float rim = exp(-pow((height - 0.86) * 16.0, 2.0));
  face += uAccent * rim * uEnergy * (0.25 + 0.45 * crystal);

  face += uAccent * cellFlash * 1.6;
  float frontA = cover * cellVis;

  // ------------------------------------------------------------ extrusion
  float sideA = 0.0;
  float sideT = 1.0;
  for (int k = 1; k <= EXTRUDE_STEPS; k++) {
    float t = float(k) / float(EXTRUDE_STEPS);
    float s = mask(px - uExtrudeDir * uDepth * t).r;
    if (s > 0.5 && sideT > 0.999) sideT = t;
    sideA = max(sideA, s);
  }
  vec3 sideCol = mix(vec3(0.52, 0.55, 0.60), vec3(0.05, 0.06, 0.08), sideT);
  sideCol *= 0.8 + 0.2 * step(0.5, fract(sideT * 3.0 + 0.2)); // stacked plates
  sideCol += uAccent * exp(-pow((sideT - 0.42) * 18.0, 2.0)) * 0.55 * uEnergy;
  sideA *= revealed(lockTime(px, 0.5));

  // ----------------------------------------------------------------- halo
  float alive = revealed(lockTime(px, 0.5));
  float breathe = 0.85 + 0.15 * sin(uTime * 1.1);
  float glow = pow(halo, 1.6) * 0.5 * uEnergy * breathe * alive;
  float beamX = mix(uTextBox.x, uTextBox.z, (uReveal - 0.04) / 0.72);
  float beam = exp(-pow((px.x - beamX) / (uCell * 1.4), 2.0)) * (1.0 - smoothstep(0.95, 1.15, uReveal));
  glow += beam * smoothstep(0.02, 0.5, halo) * 1.4;

  // -------------------------------------------------------------- sparkles
  float spark = 0.0;
  float sCell = uCell * 2.4;
  vec2 sg = px / sCell;
  vec2 si = floor(sg);
  float sr = hash1(si + 41.0);
  if (sr > 0.8) {
    vec2 d = (fract(sg) - (0.25 + 0.5 * hash2(si + 5.0))) * sCell / uScale;
    float tw = pow(0.5 + 0.5 * sin(uTime * (1.2 + sr * 3.0) + sr * 60.0), 8.0);
    float core = exp(-dot(d, d) * 0.6);
    float rays = exp(-abs(d.x) * 0.9) * exp(-abs(d.y) * 0.12)
               + exp(-abs(d.y) * 0.9) * exp(-abs(d.x) * 0.12);
    spark = (core + 0.4 * rays) * tw * smoothstep(0.12, 0.45, halo) * alive;
  }

  // ------------------------------------------------------------- composite
  // premultiplied alpha, back to front: halo, extrusion, face, sparkles
  vec3 col = uAccent * glow;
  float a = clamp(glow * 0.75, 0.0, 1.0);
  col = sideCol * sideA + col * (1.0 - sideA);
  a = sideA + a * (1.0 - sideA);
  col = face * frontA + col * (1.0 - frontA);
  a = frontA + a * (1.0 - frontA);
  col += vec3(0.80, 0.97, 1.0) * spark;
  col = clamp(col, 0.0, 1.0);
  a = clamp(max(a, max(col.r, max(col.g, col.b))), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`
