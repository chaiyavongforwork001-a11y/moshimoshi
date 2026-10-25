import * as THREE from 'three'
import { MOCHI } from '@/lib/colors'
import type { MochiColor } from '@/lib/types'
import { BODY_H, MOCHI_FOOT } from './mochiGeometry'

/*
 * "Jelly mochi" material: MeshPhysicalMaterial (sheen + light clearcoat)
 * extended with
 * - a soft-body vertex deformation driven by per-mochi uniforms: uLean
 *   (top displacement xz + vertical stretch y, base stays planted) and
 *   uJiggle (base bulges while the crown narrows, and back) — the CPU runs
 *   the springs, the GPU bends the body; the face shader shares the chunk;
 * - fake subsurface translucency for our flat / no-tone-mapping pipeline:
 *   deeper dough at the base, a glow brighter toward the crown, saturated
 *   (never grey) shadow side, a lighter fresnel rim and a soft gloss spot.
 */
export interface JellyUniforms {
  uLean: { value: THREE.Vector3 }
  uJiggle: { value: number }
  uFoot: { value: number }
  uHeight: { value: number }
}

export const makeJellyUniforms = (): JellyUniforms => ({
  uLean: { value: new THREE.Vector3() },
  uJiggle: { value: 0 },
  uFoot: { value: MOCHI_FOOT },
  uHeight: { value: BODY_H },
})

export const JELLY_VERTEX_PARS = /* glsl */ `
uniform vec3 uLean;
uniform float uJiggle;
uniform float uFoot;
uniform float uHeight;
float jellyH(vec3 p) { return clamp((p.y - uFoot) / uHeight, 0.0, 1.0); }
float jellyRad(float h) { return 1.0 + uJiggle * (0.5 - h) - max(uLean.y, 0.0) * 0.32 * h; }
vec3 jellyPos(vec3 p) {
  float h = jellyH(p);
  vec3 q = p;
  q.xz *= jellyRad(h);
  q.xz += uLean.xz * h * h;
  q.y += uLean.y * h;
  return q;
}
// inverse-transpose of the deformation's Jacobian (up to scale)
vec3 jellyNormal(vec3 p, vec3 n) {
  float h = jellyH(p);
  float a = jellyRad(h);
  float dr = (-uJiggle - max(uLean.y, 0.0) * 0.32) / uHeight;
  float bx = p.x * dr + 2.0 * uLean.x * h / uHeight;
  float bz = p.z * dr + 2.0 * uLean.z * h / uHeight;
  float c = 1.0 + uLean.y / uHeight;
  return vec3(c * n.x, a * n.y - bx * n.x - bz * n.z, c * n.z);
}
`

interface JellyColors {
  uDeep: { value: THREE.Color }
  uTop: { value: THREE.Color }
  uRim: { value: THREE.Color }
  uScatter: { value: THREE.Color }
  uPartH: { value: number }
}

function jellyColors(color: MochiColor, partH = 0.5): JellyColors {
  const p = MOCHI[color]
  const base = new THREE.Color(p.base)
  const shade = new THREE.Color(p.shade)
  const light = new THREE.Color(p.light)
  // cream sits on cream pages: a deeper base and a less white rim keep its silhouette
  const cream = color === 'cream'
  return {
    uDeep: { value: base.clone().lerp(shade, cream ? 0.7 : 0.55) },
    uTop: { value: light.clone().lerp(new THREE.Color('#FFFFFF'), 0.2) },
    uRim: { value: light.clone().lerp(new THREE.Color('#FFFFFF'), cream ? 0.3 : 0.55) },
    uScatter: { value: base.clone().lerp(shade, 0.35) },
    uPartH: { value: partH },
  }
}

const FRAG_PARS = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uTop;
uniform vec3 uRim;
uniform vec3 uScatter;
varying float vJH;
`

const COLOR_FRAG = /* glsl */ `
  // dough gradient: a little deeper where it settles, lighter toward the crown
  diffuseColor.rgb = mix(uDeep, diffuseColor.rgb, smoothstep(0.0, 0.3, vJH));
  diffuseColor.rgb = mix(diffuseColor.rgb, uTop, smoothstep(0.5, 1.0, vJH) * 0.55);
`

const SSS_FRAG = /* glsl */ `
  {
    vec3 V = normalize(vViewPosition);
    float ndv = clamp(dot(normal, V), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.4);
    // light scattered through the jelly: the shadow side keeps a saturated tone
    float alb = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 1e-3);
    float lit = dot(outgoingLight, vec3(0.299, 0.587, 0.114)) / alb;
    vec3 scatter = mix(uScatter, diffuseColor.rgb, 0.4);
    outgoingLight = mix(outgoingLight, scatter * 0.94, (1.0 - smoothstep(0.62, 0.98, lit)) * 0.6);
    // inner glow, strongest near the crown
    outgoingLight += uTop * smoothstep(0.35, 1.0, vJH) * 0.05 * (0.4 + 0.6 * ndv);
    // translucent rim: the edge looks lit from within
    outgoingLight = mix(outgoingLight, uRim, fres * 0.62);
    // one soft round toy gloss at ~10-11 o'clock, fixed to the key light
    vec3 L = normalize(vec3(-0.5, 0.75, 0.45));
    float spec = pow(max(dot(reflect(-V, normal), L), 0.0), 14.0);
    outgoingLight = mix(outgoingLight, vec3(1.0), spec * 0.55);
    outgoingLight = min(outgoingLight, vec3(1.0));
  }
`

function patch(mat: THREE.MeshPhysicalMaterial, uniforms: Record<string, { value: unknown }>, deform: boolean) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\n${deform ? JELLY_VERTEX_PARS : 'uniform float uPartH;'}\nvarying float vJH;`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        deform
          ? 'vec3 objectNormal = jellyNormal(position, normal);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif'
          : '#include <beginnormal_vertex>',
      )
      .replace(
        '#include <begin_vertex>',
        deform ? 'vec3 transformed = jellyPos(position);\nvJH = jellyH(position);' : '#include <begin_vertex>\nvJH = uPartH;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${COLOR_FRAG}`)
      .replace('#include <opaque_fragment>', `${SSS_FRAG}\n#include <opaque_fragment>`)
  }
  // every jelly material shares one program per variant
  mat.customProgramCacheKey = () => (deform ? 'mochi-jelly-v2' : 'mochi-jelly-rigid-v2')
}

function baseMaterial(color: MochiColor) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MOCHI[color].base),
    roughness: 0.42,
    sheen: 1,
    sheenRoughness: 0.32,
    sheenColor: new THREE.Color('#FFFFFF'),
    // low, soft clearcoat: a broad sheen, never a thin streak down the forehead
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
  })
}

export type JellyMaterial = THREE.MeshPhysicalMaterial & { userData: { jelly: JellyUniforms } }

/** A per-mochi body material (its deformation uniforms are its own). Dispose it on unmount. */
export function createJellyMaterial(color: MochiColor, jelly: JellyUniforms = makeJellyUniforms()): JellyMaterial {
  const mat = baseMaterial(color) as JellyMaterial
  mat.userData.jelly = jelly
  patch(mat, { ...jelly, ...jellyColors(color) }, true)
  return mat
}

const rigid = new Map<string, THREE.MeshPhysicalMaterial>()
/**
 * Shared jelly look for rigid parts (arms, feet, ears) of a body colour;
 * `h` picks where on the body gradient the part sits (0 base … 1 crown).
 */
export function getJellyPart(color: MochiColor, h = 0.4) {
  const key = `${color}:${h.toFixed(2)}`
  let m = rigid.get(key)
  if (!m) {
    m = baseMaterial(color)
    patch(m, { ...jellyColors(color, h) }, false)
    rigid.set(key, m)
  }
  return m
}
