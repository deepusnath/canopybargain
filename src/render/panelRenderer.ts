import type { Layer, PanelDesign, PanelDims, TextLayer, ImageLayer, ShapeLayer, QrLayer } from '../model/types'
import { patternById } from '../model/patterns'
import { getImage } from './imageCache'
import qrcodeGenerator from 'qrcode-generator'

// QR matrices are pure functions of the url — cache across redraws
const qrCache = new Map<string, boolean[][]>()
function qrMatrix(url: string): boolean[][] | null {
  const hit = qrCache.get(url)
  if (hit) return hit
  try {
    const qr = qrcodeGenerator(0, 'M')
    qr.addData(url)
    qr.make()
    const n = qr.getModuleCount()
    const grid: boolean[][] = []
    for (let r = 0; r < n; r++) {
      const row: boolean[] = []
      for (let c = 0; c < n; c++) row.push(qr.isDark(r, c))
      grid.push(row)
    }
    if (qrCache.size > 40) qrCache.clear()
    qrCache.set(url, grid)
    return grid
  } catch {
    return null // url too long for the symbol version
  }
}

export interface RenderOpts {
  /** pixels per inch of print space */
  ppi: number
  guides?: boolean
  selectedLayerId?: string | null
}

const BLEED_IN = 1.5
const SAFE_IN = 4

/** Panel outline in canvas pixels (also used for clipping + hit tests). */
export function shapePath(dims: PanelDims, w: number, h: number, inset = 0): Path2D {
  const p = new Path2D()
  const i = inset
  if (dims.shape === 'rect') {
    p.rect(i, i, w - 2 * i, h - 2 * i)
  } else if (dims.shape === 'triangle') {
    // inset approximated by shrinking toward the centroid
    const cx = w / 2
    const cy = (2 / 3) * h
    const k = 1 - (inset / h) * 3
    p.moveTo(cx + (cx - cx) * k, cy + (0 - cy) * k)
    p.lineTo(cx + (w - cx) * k, cy + (h - cy) * k)
    p.lineTo(cx + (0 - cx) * k, cy + (h - cy) * k)
    p.closePath()
  } else {
    const topW = ((dims.topWIn ?? dims.wIn / 3) / dims.wIn) * w
    const cx = w / 2
    const cy = (2 / 3) * h
    const k = 1 - (inset / h) * 3
    const pts: Array<[number, number]> = [
      [cx - topW / 2, 0],
      [cx + topW / 2, 0],
      [w, h],
      [0, h],
    ]
    pts.forEach(([x, y], idx) => {
      const px = cx + (x - cx) * k
      const py = cy + (y - cy) * k
      if (idx === 0) p.moveTo(px, py)
      else p.lineTo(px, py)
    })
    p.closePath()
  }
  return p
}

export function canvasSize(dims: PanelDims, ppi: number): { w: number; h: number } {
  return { w: Math.max(2, Math.round(dims.wIn * ppi)), h: Math.max(2, Math.round(dims.hIn * ppi)) }
}

export function renderPanel(
  ctx: CanvasRenderingContext2D,
  panel: PanelDesign,
  dims: PanelDims,
  opts: RenderOpts,
): void {
  const { w, h } = canvasSize(dims, opts.ppi)
  ctx.canvas.width = w
  ctx.canvas.height = h
  ctx.clearRect(0, 0, w, h)

  const outline = shapePath(dims, w, h)
  ctx.save()
  ctx.clip(outline)

  // background
  const bg = panel.background
  if (bg.pattern && bg.pattern.id !== 'none') {
    patternById(bg.pattern.id).paint(ctx, w, h, bg.pattern.colorA, bg.pattern.colorB)
  } else {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, w, h)
  }

  // layers
  for (const layer of panel.layers) drawLayer(ctx, layer, dims, opts)
  ctx.restore()

  if (opts.guides) {
    ctx.save()
    ctx.lineWidth = Math.max(1, opts.ppi / 6)
    ctx.setLineDash([opts.ppi, opts.ppi * 0.6])
    ctx.strokeStyle = '#e33'
    ctx.stroke(shapePath(dims, w, h, BLEED_IN * opts.ppi))
    ctx.strokeStyle = '#2a2'
    ctx.stroke(shapePath(dims, w, h, SAFE_IN * opts.ppi))
    ctx.restore()

    if (opts.selectedLayerId) {
      const sel = panel.layers.find((l) => l.id === opts.selectedLayerId)
      if (sel) {
        const bb = layerBBox(ctx, sel, dims, opts.ppi)
        ctx.save()
        ctx.strokeStyle = '#2b7de9'
        ctx.lineWidth = Math.max(1.5, opts.ppi / 5)
        ctx.setLineDash([opts.ppi * 0.5, opts.ppi * 0.35])
        ctx.strokeRect(bb.x, bb.y, bb.w, bb.h)
        ctx.restore()
      }
    }
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  dims: PanelDims,
  opts: RenderOpts,
): void {
  const { w, h } = canvasSize(dims, opts.ppi)
  const cx = layer.x * w
  const cy = layer.y * h
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  if (layer.type === 'text') drawText(ctx, layer, opts.ppi)
  else if (layer.type === 'image') drawImage(ctx, layer, w)
  else if (layer.type === 'shape') drawShape(ctx, layer, w)
  else drawQr(ctx, layer, w)
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, layer: ShapeLayer, panelWpx: number): void {
  const w = layer.scale * panelWpx
  const h = w * layer.aspect
  ctx.globalAlpha = layer.opacity
  ctx.fillStyle = layer.color
  switch (layer.shape) {
    case 'rect':
      ctx.fillRect(-w / 2, -h / 2, w, h)
      break
    case 'circle':
      ctx.beginPath()
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'star': {
      const outer = Math.min(w, h) / 2
      const inner = outer * 0.42
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = (i * Math.PI) / 5 - Math.PI / 2
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'line':
      ctx.fillRect(-w / 2, -h / 2, w, Math.max(2, h))
      break
  }
  ctx.globalAlpha = 1
}

function drawQr(ctx: CanvasRenderingContext2D, layer: QrLayer, panelWpx: number): void {
  const grid = qrMatrix(layer.url || 'https://canopybargain.com')
  const size = layer.scale * panelWpx
  if (!grid) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(-size / 2, -size / 2, size, size)
    return
  }
  const n = grid.length
  const cell = size / (n + 4) // 2-module quiet zone each side
  // white backing incl. quiet zone keeps the code scannable on any background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-size / 2, -size / 2, size, size)
  ctx.fillStyle = layer.dark
  const origin = -size / 2 + cell * 2
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c]) ctx.fillRect(origin + c * cell, origin + r * cell, cell + 0.5, cell + 0.5)
    }
  }
}

function fontString(layer: TextLayer, px: number): string {
  return `${layer.weight === 'bold' ? 'bold ' : ''}${px}px ${layer.font}`
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, ppi: number): void {
  const px = layer.sizeIn * ppi
  ctx.font = fontString(layer, px)
  ctx.fillStyle = layer.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (Math.abs(layer.arc) < 2) {
    ctx.fillText(layer.text, 0, 0)
    return
  }
  // curved text: place characters along a circle
  const chars = Array.from(layer.text)
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((s, v) => s + v, 0)
  const sweep = (Math.abs(layer.arc) * Math.PI) / 180
  const radius = total / sweep
  const up = layer.arc > 0
  let acc = 0
  for (let i = 0; i < chars.length; i++) {
    const mid = acc + widths[i] / 2
    acc += widths[i]
    const t = mid / total - 0.5 // -0.5..0.5
    const ang = t * sweep
    ctx.save()
    if (up) {
      ctx.translate(Math.sin(ang) * radius, -Math.cos(ang) * radius + radius)
      ctx.rotate(ang)
    } else {
      ctx.translate(Math.sin(ang) * radius, Math.cos(ang) * radius - radius)
      ctx.rotate(-ang)
    }
    ctx.fillText(chars[i], 0, 0)
    ctx.restore()
  }
}

function drawImage(ctx: CanvasRenderingContext2D, layer: ImageLayer, panelWpx: number): void {
  const img = getImage(layer.dataUrl)
  const wpx = layer.scale * panelWpx
  const hpx = wpx * (layer.naturalH / layer.naturalW)
  if (img) {
    ctx.drawImage(img, -wpx / 2, -hpx / 2, wpx, hpx)
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(-wpx / 2, -hpx / 2, wpx, hpx)
  }
}

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

/** Axis-aligned bounding box of a layer in canvas pixels (ignores rotation). */
export function layerBBox(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
  dims: PanelDims,
  ppi: number,
): BBox {
  const { w, h } = canvasSize(dims, ppi)
  const cx = layer.x * w
  const cy = layer.y * h
  if (layer.type === 'image') {
    const wpx = layer.scale * w
    const hpx = wpx * (layer.naturalH / layer.naturalW)
    return { x: cx - wpx / 2, y: cy - hpx / 2, w: wpx, h: hpx }
  }
  if (layer.type === 'shape') {
    const wpx = layer.scale * w
    const hpx = wpx * layer.aspect
    return { x: cx - wpx / 2, y: cy - hpx / 2, w: wpx, h: hpx }
  }
  if (layer.type === 'qr') {
    const s = layer.scale * w
    return { x: cx - s / 2, y: cy - s / 2, w: s, h: s }
  }
  const px = layer.sizeIn * ppi
  ctx.font = fontString(layer, px)
  const tw = ctx.measureText(layer.text).width
  const arcPad = Math.abs(layer.arc) > 2 ? tw * 0.15 : 0
  return { x: cx - tw / 2, y: cy - px / 2 - arcPad, w: tw, h: px + arcPad * 2 }
}

/** Effective DPI of an image layer at print size; used for quality warnings. */
export function imageDpi(layer: ImageLayer, dims: PanelDims): number {
  const printedWIn = layer.scale * dims.wIn
  return layer.naturalW / Math.max(0.01, printedWIn)
}
