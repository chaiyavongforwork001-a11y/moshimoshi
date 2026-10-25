import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { JELLY_VERTEX_PARS, type JellyUniforms } from './jelly'
import { FACE_LAYOUT } from './mochiGeometry'

export type MochiExpression = 'smile' | 'happy' | 'wink' | 'sleepy' | 'talk' | 'wow'
/** every face the 3D mochi can make ('sparkle' = starry excited eyes) */
export type MochiFaceExpression = MochiExpression | 'sparkle'

/*
 * The whole face is ONE transparent patch of the body surface drawn by a
 * fragment shader (anti-aliased SDFs): eyes, highlights, mouth and blush all
 * follow the curvature exactly and ride along with the jelly deformation.
 */
export const EYE = { open: 0, happy: 1, sleepy: 2, sparkle: 3, squeeze: 4 } as const
export const MOUTH = { smile: 0, omega: 1, open: 2, talk: 3, o: 4, small: 5, cat: 6 } as const
type EyeKind = (typeof EYE)[keyof typeof EYE]
type MouthKind = (typeof MOUTH)[keyof typeof MOUTH]

export const EXPRESSIONS: Record<MochiFaceExpression, { l: EyeKind; r: EyeKind; mouth: MouthKind; eyeScale?: number }> = {
  smile: { l: EYE.open, r: EYE.open, mouth: MOUTH.smile },
  happy: { l: EYE.happy, r: EYE.happy, mouth: MOUTH.open },
  wink: { l: EYE.open, r: EYE.happy, mouth: MOUTH.smile },
  sleepy: { l: EYE.sleepy, r: EYE.sleepy, mouth: MOUTH.small },
  talk: { l: EYE.open, r: EYE.open, mouth: MOUTH.talk },
  wow: { l: EYE.open, r: EYE.open, mouth: MOUTH.o, eyeScale: 1.1 },
  sparkle: { l: EYE.sparkle, r: EYE.sparkle, mouth: MOUTH.open, eyeScale: 1.06 },
}

export interface FaceUniforms {
  uEyeKind: { value: THREE.Vector2 }
  uOpen: { value: THREE.Vector2 }
  uLook: { value: THREE.Vector2 }
  uHi: { value: THREE.Vector2 }
  uEyeScale: { value: number }
  uMouthKind: { value: number }
  uMouthOpen: { value: number }
  uBlush: { value: number }
  uEyeCol: { value: THREE.Color }
  uEyeGlow: { value: THREE.Color }
  uMouthCol: { value: THREE.Color }
  uTongueCol: { value: THREE.Color }
  uBlushCol: { value: THREE.Color }
}

const VERT = /* glsl */ `
${JELLY_VERTEX_PARS}
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(jellyPos(position), 1.0);
}
`

const L = FACE_LAYOUT
const f = (n: number) => n.toFixed(4)

const FRAG = /* glsl */ `
varying vec2 vUv;
uniform vec2 uEyeKind;
uniform vec2 uOpen;
uniform vec2 uLook;
uniform vec2 uHi;
uniform float uEyeScale;
uniform float uMouthKind;
uniform float uMouthOpen;
uniform float uBlush;
uniform vec3 uEyeCol;
uniform vec3 uEyeGlow;
uniform vec3 uMouthCol;
uniform vec3 uTongueCol;
uniform vec3 uBlushCol;

const float EYE_U = ${f(L.eyeU)};
const vec2 EYE_R = vec2(${f(L.eyeRX)}, ${f(L.eyeRY)});
const float MOUTH_V = ${f(L.mouthV)};
const vec2 BLUSH = vec2(${f(L.blushU)}, ${f(L.blushV)});

vec4 P = vec4(0.0);
void over(vec3 c, float a) { P = P * (1.0 - a) + vec4(c * a, a); }
float aa(float d) { return clamp(0.5 - d / max(fwidth(d), 1e-5), 0.0, 1.0); }
float sdEllipse(vec2 p, vec2 r) { return (length(p / r) - 1.0) * min(r.x, r.y); }
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
  p.x = abs(p.x);
  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}
float sdSeg(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
// soft four-point sparkle
float sdStar(vec2 p, float r) {
  p = abs(p) / r;
  return (pow(p.x, 0.55) + pow(p.y, 0.55) - 1.0) * r * 0.45;
}

void eye(vec2 p, float kind, float open, float mirror) {
  vec2 r = EYE_R * uEyeScale;
  if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) {
    vec2 q = p - uLook;
    q.y /= max(open, 0.08);
    float d = sdEllipse(q, r);
    float a = aa(d);
    if (a <= 0.0) return;
    vec2 n = q / r;
    // warm light pooling in the lower iris, a darker rim around the top
    float low = smoothstep(0.0, -0.95, n.y) * smoothstep(1.02, 0.55, length(n));
    vec3 c = mix(uEyeCol, uEyeGlow, low * 0.9);
    c = mix(c, uEyeCol * 0.72, smoothstep(0.62, 1.0, length(n)) * smoothstep(-0.3, 0.6, n.y) * 0.7);
    over(c, a);
    // highlights stay put relative to the light, the dark eye moves under them
    float show = smoothstep(0.42, 0.7, open) * a;
    vec2 h = p - uLook * 0.35 - uHi;
    float d1, d2;
    if (kind > 2.5) {
      d1 = sdStar(h - vec2(-0.3, 0.33) * r, r.x * 0.6);
      d2 = sdStar(h - vec2(0.38, -0.36) * r, r.x * 0.3);
    } else {
      d1 = sdEllipse(h - vec2(-0.3, 0.36) * r, r * vec2(0.36, 0.34));
      d2 = length(h - vec2(0.4, -0.4) * r) - r.x * 0.16;
    }
    over(vec3(1.0), aa(min(d1, d2)) * show);
  } else if (kind < 1.5) {
    // ^ happy closed eye
    float d = sdArc(p - vec2(0.0, -0.075), vec2(sin(1.05), cos(1.05)), 0.115 * uEyeScale, 0.024);
    over(uEyeCol, aa(d));
  } else if (kind < 2.5) {
    // u peaceful closed eye
    float d = sdArc(vec2(p.x, -p.y) - vec2(0.0, -0.085), vec2(sin(1.0), cos(1.0)), 0.105, 0.021);
    over(uEyeCol, aa(d));
  } else {
    // > < squeezed
    vec2 q = vec2(p.x * mirror, p.y);
    float d = min(sdSeg(q, vec2(-0.07, 0.065), vec2(0.06, 0.0), 0.024), sdSeg(q, vec2(-0.07, -0.065), vec2(0.06, 0.0), 0.024));
    over(uEyeCol, aa(d));
  }
}

void mouth(vec2 p) {
  p.y -= MOUTH_V;
  float k = uMouthKind;
  if (k < 0.5) {
    float d = sdArc(vec2(p.x, -p.y) - vec2(0.0, -0.038), vec2(sin(1.0), cos(1.0)), 0.054, 0.0125);
    over(uMouthCol, aa(d));
  } else if (k < 1.5 || k > 5.5) {
    // w (omega / cat mouth)
    vec2 q = vec2(abs(p.x) - 0.034, -p.y);
    float d = sdArc(q - vec2(0.0, -0.016), vec2(sin(1.45), cos(1.45)), 0.034, 0.0115);
    over(uMouthCol, aa(d));
  } else if (k < 2.5) {
    // open happy D
    vec2 q = p - vec2(0.0, 0.026);
    float r = 0.086;
    float a = aa(max(sdEllipse(q, vec2(r, r * 1.05)), q.y));
    float t = aa(sdEllipse(q - vec2(0.0, -r * 0.92), vec2(r * 0.62, r * 0.48)));
    over(mix(uMouthCol, uTongueCol, t), a);
  } else if (k < 3.5) {
    // talking: an oval that opens and closes
    vec2 r = vec2(0.057 - 0.009 * uMouthOpen, 0.016 + 0.054 * uMouthOpen);
    float a = aa(sdEllipse(p, r));
    float t = aa(sdEllipse(p - vec2(0.0, -r.y * 0.85), vec2(r.x * 0.7, r.y * 0.55)));
    over(mix(uMouthCol, uTongueCol, t), a);
  } else if (k < 4.5) {
    float s = 0.92 + 0.08 * uMouthOpen;
    float a = aa(sdEllipse(p, vec2(0.05, 0.064) * s));
    float t = aa(sdEllipse(p - vec2(0.0, -0.042), vec2(0.031, 0.019)));
    over(mix(uMouthCol, uTongueCol, t * 0.9), a);
  } else {
    float s = 1.0 + 0.2 * uMouthOpen;
    over(uMouthCol, aa(sdEllipse(p, vec2(0.026, 0.02) * s)));
  }
}

void main() {
  vec2 p = vUv;
  // blush: big soft ovals under / outside the eyes
  float b = 0.0;
  for (int i = 0; i < 2; i++) {
    float sx = i == 0 ? -1.0 : 1.0;
    vec2 q = (p - vec2(sx * BLUSH.x, BLUSH.y)) / vec2(0.22, 0.126);
    b += exp(-dot(q, q) * 1.9);
  }
  over(uBlushCol, clamp(b, 0.0, 1.0) * uBlush);
  mouth(p);
  eye(p - vec2(-EYE_U, 0.0), uEyeKind.x, uOpen.x, 1.0);
  eye(p - vec2(EYE_U, 0.0), uEyeKind.y, uOpen.y, -1.0);
  if (P.a < 0.003) discard;
  gl_FragColor = vec4(P.rgb / P.a, P.a);
  #include <colorspace_fragment>
}
`

export type FaceMaterial = THREE.ShaderMaterial & { uniforms: FaceUniforms & JellyUniforms }

/** per-mochi face material; it shares the body's deformation uniforms */
export function createFaceMaterial(color: MochiColor, jelly: JellyUniforms): FaceMaterial {
  const p = MOCHI[color]
  const blush = new THREE.Color('#FF7F9E').lerp(new THREE.Color(p.shade), color === 'pink' || color === 'peach' ? 0.25 : 0.1)
  const glow = new THREE.Color('#8A4E5E').lerp(new THREE.Color(p.shade), 0.22)
  const face: FaceUniforms = {
    uEyeKind: { value: new THREE.Vector2() },
    uOpen: { value: new THREE.Vector2(1, 1) },
    uLook: { value: new THREE.Vector2() },
    uHi: { value: new THREE.Vector2() },
    uEyeScale: { value: 1 },
    uMouthKind: { value: 0 },
    uMouthOpen: { value: 0 },
    uBlush: { value: 0.5 },
    uEyeCol: { value: new THREE.Color('#3A2129') },
    uEyeGlow: { value: glow },
    uMouthCol: { value: new THREE.Color('#5C2A2E') },
    uTongueCol: { value: new THREE.Color('#FF8A9B') },
    uBlushCol: { value: blush },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...jelly, ...face },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  return mat as FaceMaterial
}
