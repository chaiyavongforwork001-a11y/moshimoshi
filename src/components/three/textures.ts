import * as THREE from 'three'

let softDot: THREE.CanvasTexture | null = null

/**
 * A white radial "soft dot" with a smooth alpha falloff, generated on a
 * canvas (no downloads, works offline). Used for blush, blob shadows, glows.
 */
export function getSoftDot(): THREE.CanvasTexture {
  if (softDot) return softDot
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  // gaussian-ish falloff
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    g.addColorStop(t, `rgba(255,255,255,${Math.exp(-4.2 * t * t) * (1 - t * t)})`)
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  softDot = new THREE.CanvasTexture(canvas)
  softDot.colorSpace = THREE.SRGBColorSpace
  return softDot
}
