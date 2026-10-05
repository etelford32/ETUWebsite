/**
 * ETU 2175 Title Typography — GLSL (WebGL 1 / GLSL ES 1.00).
 *
 * Every letter is its own quad (one GlyphActor in EtuTitleRenderer.ts)
 * covering a padded atlas cell, so letters can move independently.
 * Each frame draws all quads three times:
 *   pass 0  halo, sparkles, dust, glints      (additive)
 *   pass 1  extruded side walls               (premultiplied over)
 *   pass 2  faces: tiles, chamfer, panel line (premultiplied over)
 * so no letter's glow or wall ever lands on top of another letter's face.
 *
 * Look (see public/brand/etu-title-typography.webp): heavy chamfered block
 * capitals; faces of raised irregular tiles, riveted silver plating peeled
 * back to dark crystal whose seams glow cyan; a flat silver chamfer and an
 * engraved panel line around each outline; stacked metal walls receding
 * toward a vanishing point below the title; halo and star glints.
 */

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aCorner;

uniform vec2  uRes;        // canvas, device px
uniform vec2  uCellSize;   // this glyph's atlas cell, px
uniform vec2  uOrigin;     // cell top-left at rest, canvas px
uniform vec2  uOffset;     // animated translation, px
uniform float uRot;        // radians
uniform float uZoom;

varying vec2 vLocal;       // px inside the cell (pre-transform)

void main() {
  vLocal = aCorner * uCellSize;
  vec2 c = uCellSize * 0.5;
  vec2 p = (vLocal - c) * uZoom;
  float cs = cos(uRot);
  float sn = sin(uRot);
  p = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
  p += c + uOrigin + uOffset;
  vec2 clip = p / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vLocal;

uniform sampler2D uAtlas;
uniform vec2  uAtlasSize;   // px
uniform vec4  uCellRect;    // x, y, w, h in the atlas, px
uniform vec2  uCellSize;
uniform int   uPass;

uniform float uScale;       // device pixel ratio
uniform float uTime;
uniform float uCap;         // cap height, px
uniform float uInMax;       // encoded distance ranges, px
uniform float uOutMax;
uniform float uTile;        // tile size, px
uniform float uDepth;       // wall length, px
uniform vec3  uAccent;
uniform float uEnergy;
uniform float uCrystal;

// per glyph
uniform vec2  uSeed;        // rest position: tiles stay continuous across letters
uniform vec2  uExtrudeDir;  // toward the vanishing point, y down
uniform float uReveal;      // tile lock-in progress: 0 → 1.4 settled
uniform float uOpacity;
uniform float uFlash;       // landing / impact flash
uniform float uCharge;      // hover / pulse energy
uniform vec3  uPointer;     // local px, strength
uniform vec3  uGlint;       // local px, strength

const int EXTRUDE_STEPS = 14;
const vec3 LIGHT = vec3(-0.5, -0.72, 0.85);

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
  return mix(mix(hash1(i), hash1(i + vec2(1.0, 0.0)), u.x),
             mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), u.x), u.y);
}

// x = F1, y = F2 - F1 (0 on seams), zw = cell id; toSeed = vector to nearest seed
vec4 voronoi(vec2 p, out vec2 toSeed) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  vec2 id = vec2(0.0);
  toSeed = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + 0.15 + 0.7 * hash2(n + g) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = n + g; toSeed = r; }
      else if (d < d2) { d2 = d; }
    }
  }
  d1 = sqrt(d1);
  return vec4(d1, sqrt(d2) - d1, id);
}

// coverage, inside distance px, outside distance px
vec3 field(vec2 q) {
  if (q.x < 0.0 || q.y < 0.0 || q.x > uCellSize.x || q.y > uCellSize.y) return vec3(0.0, 0.0, uOutMax);
  vec3 t = texture2D(uAtlas, (uCellRect.xy + q) / uAtlasSize).rgb;
  return vec3(t.r, t.g * uInMax, t.b * uOutMax);
}

float settled() { return clamp(uReveal / 1.4, 0.0, 1.0); }

vec4 premul(vec3 c, float a) { return vec4(c * a, a); }

// -------------------------------------------------------------- pass 0
vec4 haloPass(vec2 q, vec3 f) {
  float dout = f.z;
  float near = exp(-dout / (0.09 * uCap));
  float far = exp(-dout / (0.32 * uCap));
  float breathe = 0.85 + 0.15 * sin(uTime * 1.1 + uSeed.x * 0.013);
  float glow = (near * 0.38 + far * 0.12) * uEnergy * breathe * settled();
  glow += (uFlash * 1.1 + uCharge * 0.55) * exp(-dout / (0.2 * uCap));

  vec2 gp = q + uSeed;
  float px = uScale;

  // star sparkles hugging the outline
  float spark = 0.0;
  float sCell = uTile * 2.6;
  vec2 si = floor(gp / sCell);
  float sr = hash1(si + 41.0);
  if (sr > 0.78) {
    vec2 d = (fract(gp / sCell) - (0.25 + 0.5 * hash2(si + 5.0))) * sCell / px;
    float tw = pow(0.5 + 0.5 * sin(uTime * (1.2 + sr * 3.0) + sr * 60.0), 8.0);
    float rays = exp(-abs(d.x) * 0.9) * exp(-abs(d.y) * 0.13) + exp(-abs(d.y) * 0.9) * exp(-abs(d.x) * 0.13);
    spark = (exp(-dot(d, d) * 0.6) + 0.4 * rays) * tw * exp(-dout / (0.12 * uCap)) * settled();
  }

  // drifting dust motes
  float dust = 0.0;
  float dCell = uTile * 1.3;
  vec2 dp = gp + vec2(0.0, uTime * 6.0 * px);
  vec2 di = floor(dp / dCell);
  float dr = hash1(di + 7.0);
  if (dr > 0.86) {
    vec2 d = (fract(dp / dCell) - (0.2 + 0.6 * hash2(di + 3.0))) * dCell / px;
    dust = exp(-dot(d, d) * 1.4) * (0.35 + 0.65 * sin(uTime * 2.0 + dr * 30.0)) * exp(-dout / (0.2 * uCap));
  }

  // lens glint (driven from JS)
  float glint = 0.0;
  if (uGlint.z > 0.001) {
    vec2 d = (q - uGlint.xy) / px;
    float r = 0.5 * uCap / px;
    glint = (exp(-dot(d, d) / (r * 0.02)) * 1.5
           + exp(-abs(d.y) * 1.1) * exp(-abs(d.x) / r) * 0.9
           + exp(-abs(d.x) * 1.1) * exp(-abs(d.y) / (r * 0.6)) * 0.7) * uGlint.z;
  }

  vec3 col = uAccent * glow + vec3(0.78, 0.97, 1.0) * (spark + dust * 0.6) + vec3(0.85, 0.98, 1.0) * glint;
  // fade to nothing before the cell edge so quads never show as boxes
  float edgeFade = 1.0 - smoothstep(0.5 * uOutMax, 0.95 * uOutMax, dout);
  edgeFade *= smoothstep(0.0, 6.0 * px, min(min(q.x, q.y), min(uCellSize.x - q.x, uCellSize.y - q.y)));
  col *= uOpacity * edgeFade;
  col = min(col, vec3(1.0));
  return vec4(col, max(col.r, max(col.g, col.b)));
}

// -------------------------------------------------------------- pass 1
vec4 wallPass(vec2 q) {
  float a = 0.0;
  float t0 = 1.0;
  for (int k = 1; k <= EXTRUDE_STEPS; k++) {
    float t = float(k) / float(EXTRUDE_STEPS);
    float s = field(q - uExtrudeDir * uDepth * t).x;
    if (s > 0.5 && t0 > 0.999) t0 = t;
    a = max(a, s);
  }
  if (a < 0.004) return vec4(0.0);
  vec3 col = mix(vec3(0.56, 0.59, 0.64), vec3(0.05, 0.06, 0.08), t0);
  col *= 0.78 + 0.22 * step(0.5, fract(t0 * 2.6 + 0.15));       // stacked plates
  col += vec3(0.25) * exp(-pow((t0 - 0.08) * 22.0, 2.0));          // lit top lip
  col += uAccent * exp(-pow((t0 - 0.46) * 18.0, 2.0)) * 0.6 * uEnergy; // energy seam
  return premul(col, a * uOpacity * smoothstep(0.2, 0.9, settled()));
}

// -------------------------------------------------------------- pass 2
vec4 facePass(vec2 q, vec3 f) {
  float cover = f.x;
  if (cover < 0.004) return vec4(0.0);
  float din = f.y;
  float px = uScale;

  // ---- tiles
  vec2 toSeed;
  vec4 v = voronoi((q + uSeed) / uTile, toSeed);
  vec2 cid = v.zw;
  float rnd = hash1(cid + 3.7);
  float tLock = rnd * 0.75 + (q.y / uCellSize.y) * 0.25;
  float cellVis = smoothstep(tLock, tLock + 0.12, uReveal);
  float cellFlash = smoothstep(tLock, tLock + 0.04, uReveal) * (1.0 - smoothstep(tLock + 0.04, tLock + 0.38, uReveal));

  float patchN = vnoise(cid * 0.2 + vec2(7.3, 1.9)) * 0.7 + vnoise(cid * 0.57 + 11.0) * 0.3;
  patchN += 0.05 * sin(uTime * 0.3 + rnd * 6.2831);
  float crystal = 1.0 - smoothstep(-0.025, 0.025, (1.0 - uCrystal) - patchN);

  // each tile is raised: its rim slopes away from the seed
  float tilt = 1.0 - smoothstep(0.0, 0.17, v.y);
  vec3 nTile = normalize(vec3(-normalize(toSeed + 1e-5) * tilt * 0.85, 1.0));
  float lamT = clamp(dot(nTile, normalize(LIGHT)), 0.0, 1.0);
  float seam = smoothstep(0.012, 0.06, v.y);

  // silver plating: grain, rivets
  float grain = vnoise((q + uSeed) / (1.6 * px)) * 0.6 + vnoise((q + uSeed) / (5.0 * px)) * 0.4;
  vec3 silver = vec3(0.5 + 0.28 * rnd + 0.1 * grain) * (0.45 + 0.75 * lamT);
  silver *= vec3(0.96, 0.98, 1.02);
  vec2 rivetAt = -toSeed + (hash2(cid + 2.1) - 0.5) * 0.5;  // pixel relative to rivet, tile units
  float rivetR = max(0.07, 1.2 * px / uTile);
  float rivet = (1.0 - smoothstep(rivetR * 0.55, rivetR, length(rivetAt))) * step(0.45, hash1(cid + 8.8));
  float rivetHi = 1.0 - smoothstep(0.0, rivetR * 0.45, length(rivetAt + rivetR * 0.35));
  silver = mix(silver, vec3(0.1), rivet * 0.8);
  silver += vec3(0.55) * rivetHi * rivet;
  silver *= mix(0.18, 1.0, seam);

  // exposed crystal
  float deep = hash1(cid + 9.1);
  vec3 glass = mix(vec3(0.0, 0.025, 0.08), vec3(0.015, 0.14, 0.24), deep * deep) * (0.55 + 0.6 * lamT);
  float seamGlow = exp(-v.y * 16.0);
  float flicker = pow(0.5 + 0.5 * sin(uTime * 1.1 + rnd * 40.0), 48.0);
  float wave = exp(-pow(fract(uTime * 0.11 + uSeed.x * 0.0004) * 1.6 - 0.3 - q.x / uCellSize.x * 0.2, 2.0) * 40.0);
  float pd = length(q - uPointer.xy) / (uTile * 5.0);
  float touch = uPointer.z * exp(-pd * pd);
  vec3 crystalCol = glass
    + uAccent * uEnergy * (seamGlow * 0.95 + flicker * 0.6 + wave * 0.18 * (0.3 + seamGlow))
    + uAccent * (touch * 1.1 + uCharge * 0.35 * (0.4 + seamGlow));

  vec3 face = mix(silver + vec3(0.2) * touch, crystalCol, crystal);

  // ---- chamfer: flat 45° facet, lit from the top-left
  float bevelW = 0.035 * uCap + 0.5 * px;
  float e = 1.0 * px;
  vec2 g = vec2(field(q + vec2(e, 0.0)).y - field(q - vec2(e, 0.0)).y,
                field(q + vec2(0.0, e)).y - field(q - vec2(0.0, e)).y);
  vec2 inward = normalize(g + 1e-5);
  vec3 nBevel = normalize(vec3(-inward, 1.0));
  vec3 L = normalize(LIGHT);
  float lamB = clamp(dot(nBevel, L), 0.0, 1.0);
  float specB = pow(max(reflect(-L, nBevel).z, 0.0), 18.0);
  vec3 bevelCol = vec3(0.6, 0.64, 0.7) * (0.12 + 1.1 * lamB) + specB * 0.7;
  bevelCol += uAccent * (0.12 + 0.3 * crystal) * uEnergy * (1.0 - lamB);
  float bevel = 1.0 - smoothstep(bevelW - 0.8 * px, bevelW + 0.8 * px, din);
  face = mix(face, bevelCol, bevel);
  face += vec3(0.35) * (1.0 - smoothstep(0.0, 1.5 * px, din)) * lamB;  // crisp outer edge

  // ---- engraved panel line just inside the chamfer
  float groove = exp(-pow((din - bevelW - 0.028 * uCap) / (0.005 * uCap + 0.5 * px), 2.0));
  face = mix(face, vec3(0.03, 0.05, 0.08), groove * 0.75 * (1.0 - bevel));
  face += uAccent * groove * uEnergy * (0.25 + 0.75 * crystal) * (1.0 - bevel);

  face += uAccent * (cellFlash * 1.5 + uFlash * 0.5);
  face = min(face, vec3(1.0));
  return premul(face, cover * cellVis * uOpacity);
}

void main() {
  vec2 q = vLocal;
  vec3 f = field(q);
  if (uPass == 0) gl_FragColor = haloPass(q, f);
  else if (uPass == 1) gl_FragColor = wallPass(q);
  else gl_FragColor = facePass(q, f);
}
`
