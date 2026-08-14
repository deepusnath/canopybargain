import type { Design } from '../model/types'

/**
 * Designs encode into the URL (gzip + base64url when CompressionStream exists,
 * plain base64url otherwise). Uploaded images are stripped — their dataUrls are
 * megabytes and don't belong in a link — and the recipient sees a note.
 */

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function gzip(bytes: Uint8Array, mode: 'gzip' | 'gunzip'): Promise<Uint8Array> {
  const stream = mode === 'gzip' ? new CompressionStream('gzip') : new DecompressionStream('gzip')
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export interface EncodedShare {
  param: string
  strippedImages: number
}

export async function encodeDesignToParam(design: Design): Promise<EncodedShare> {
  const d: Design = JSON.parse(JSON.stringify(design))
  let strippedImages = 0
  for (const part of Object.values(d.parts)) {
    const before = part.layers.length
    part.layers = part.layers.filter((l) => l.type !== 'image')
    strippedImages += before - part.layers.length
  }
  const bytes = new TextEncoder().encode(JSON.stringify(d))
  if (typeof CompressionStream !== 'undefined') {
    return { param: 'z.' + toBase64Url(await gzip(bytes, 'gzip')), strippedImages }
  }
  return { param: 'p.' + toBase64Url(bytes), strippedImages }
}

export async function decodeDesignFromParam(param: string): Promise<Design | null> {
  try {
    const [kind, payload] = [param.slice(0, 2), param.slice(2)]
    let bytes = fromBase64Url(payload)
    if (kind === 'z.') bytes = await gzip(bytes, 'gunzip')
    else if (kind !== 'p.') return null
    const d = JSON.parse(new TextDecoder().decode(bytes)) as Design
    if (d?.version !== 1 || !d.parts || !d.tentSize) return null
    return d
  } catch {
    return null
  }
}
