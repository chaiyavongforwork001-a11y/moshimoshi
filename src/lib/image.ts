/**
 * Photos for chat: decode what was picked, shrink it to at most MAX_SIDE px on the long side
 * and re-encode it as JPEG. Re-encoding through a canvas keeps only the pixels, so EXIF data
 * (GPS location, camera, time taken) never leaves the phone. The database and the storage
 * bucket only accept the JPEG this produces (supabase/migrations/20261108000004_chat_images.sql).
 */

export interface PreparedImage {
  blob: Blob
  /** object URL for previews; revoke it when it's no longer shown */
  url: string
  width: number
  height: number
}

export type ImageProblem = 'type' | 'size' | 'decode'

export class ImageError extends Error {
  constructor(readonly problem: ImageProblem) {
    super(problem)
  }
}

const MAX_SIDE = 1600
/** the bucket takes 1.5 MB; stay well under it */
const MAX_BYTES = 1_400_000
/** what we're willing to read at all */
const MAX_INPUT = 30_000_000
const QUALITY = [0.86, 0.78, 0.7, 0.62]

export async function prepareImage(file: File): Promise<PreparedImage> {
  const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.name)
  if (!looksLikeImage) throw new ImageError('type')
  if (file.size > MAX_INPUT) throw new ImageError('size')

  const source = await decode(file)
  try {
    let { width, height } = fit(source.width, source.height, MAX_SIDE)
    for (let attempt = 0; attempt < QUALITY.length; attempt++) {
      const blob = await encode(source.image, width, height, QUALITY[attempt])
      if (blob.size <= MAX_BYTES) return { blob, url: URL.createObjectURL(blob), width, height }
      // still too big: a little smaller and a little softer
      width = Math.max(1, Math.round(width * 0.82))
      height = Math.max(1, Math.round(height * 0.82))
    }
    throw new ImageError('size')
  } finally {
    source.close()
  }
}

interface Decoded {
  image: CanvasImageSource
  width: number
  height: number
  close: () => void
}

async function decode(file: File): Promise<Decoded> {
  // createImageBitmap applies the EXIF rotation; an <img> is the fallback (browsers rotate those too)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    if (!img.naturalWidth || !img.naturalHeight) throw new ImageError('decode')
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err instanceof ImageError ? err : new ImageError('decode')
  }
}

function fit(w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

function encode(image: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new ImageError('decode'))
  // JPEG has no transparency: put see-through PNGs on white instead of black
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob && blob.type === 'image/jpeg' ? resolve(blob) : reject(new ImageError('decode'))), 'image/jpeg', quality),
  )
}
