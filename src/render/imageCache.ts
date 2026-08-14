// Decoded-image cache keyed by dataUrl. Panels re-render synchronously, so
// images must already be decoded; listeners fire when a new one becomes ready.
const cache = new Map<string, HTMLImageElement>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

export function onImageReady(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getImage(dataUrl: string): HTMLImageElement | null {
  const hit = cache.get(dataUrl)
  if (hit) return hit
  if (!pending.has(dataUrl)) {
    pending.add(dataUrl)
    const img = new Image()
    img.onload = () => {
      cache.set(dataUrl, img)
      pending.delete(dataUrl)
      listeners.forEach((fn) => fn())
    }
    img.onerror = () => pending.delete(dataUrl)
    img.src = dataUrl
  }
  return null
}

/** Read a File into a downscaled dataUrl (longest edge capped) + natural size. */
export function fileToDataUrl(
  file: File,
  maxEdge = 1600,
): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width: w, height: h } = img
        if (Math.max(w, h) > maxEdge && !file.type.includes('svg')) {
          const k = maxEdge / Math.max(w, h)
          const cnv = document.createElement('canvas')
          cnv.width = Math.round(w * k)
          cnv.height = Math.round(h * k)
          cnv.getContext('2d')!.drawImage(img, 0, 0, cnv.width, cnv.height)
          const scaled = cnv.toDataURL('image/png')
          resolve({ dataUrl: scaled, w: cnv.width, h: cnv.height })
          return
        }
        resolve({ dataUrl: reader.result as string, w, h })
      }
      img.onerror = () => reject(new Error('Not a valid image'))
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
