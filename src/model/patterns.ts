export interface PatternDef {
  id: string
  label: string
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, a: string, b: string) => void
}

export const PATTERNS: PatternDef[] = [
  {
    id: 'none',
    label: 'None',
    paint: (ctx, w, h, a) => {
      ctx.fillStyle = a
      ctx.fillRect(0, 0, w, h)
    },
  },
  {
    id: 'stripes',
    label: 'Stripes',
    paint: (ctx, w, h, a, b) => {
      ctx.fillStyle = a
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = b
      const s = Math.max(w, h) / 8
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-Math.PI / 4)
      const ext = Math.max(w, h) * 1.5
      for (let x = -ext; x < ext; x += s * 2) ctx.fillRect(x, -ext, s, ext * 2)
      ctx.restore()
    },
  },
  {
    id: 'chevron',
    label: 'Chevron',
    paint: (ctx, w, h, a, b) => {
      ctx.fillStyle = a
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = b
      const seg = w / 6
      const amp = seg / 2
      const bandH = h / 7
      for (let row = 0; row < 8; row += 2) {
        const y0 = row * bandH
        ctx.beginPath()
        for (let x = 0; x <= w + seg; x += seg) {
          const y = y0 + (Math.floor(x / seg) % 2 === 0 ? 0 : amp)
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        for (let x = w + seg; x >= 0; x -= seg) {
          const y = y0 + bandH + (Math.floor(x / seg) % 2 === 0 ? 0 : amp)
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
      }
    },
  },
  {
    id: 'gradient',
    label: 'Fade',
    paint: (ctx, w, h, a, b) => {
      const g = ctx.createLinearGradient(0, h, 0, 0)
      g.addColorStop(0, a)
      g.addColorStop(1, b)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    },
  },
  {
    id: 'dots',
    label: 'Halftone',
    paint: (ctx, w, h, a, b) => {
      ctx.fillStyle = a
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = b
      const step = Math.max(w, h) / 16
      for (let y = 0, row = 0; y < h + step; y += step, row++) {
        const frac = 1 - y / h
        const r = Math.max(1, (step / 2.4) * frac)
        for (let x = row % 2 === 0 ? 0 : step / 2; x < w + step; x += step) {
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    },
  },
  {
    id: 'diamonds',
    label: 'Geometric',
    paint: (ctx, w, h, a, b) => {
      ctx.fillStyle = a
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = b
      const s = Math.max(w, h) / 10
      for (let y = 0, row = 0; y < h + s; y += s, row++) {
        for (let x = row % 2 === 0 ? 0 : s / 2; x < w + s; x += s) {
          ctx.beginPath()
          ctx.moveTo(x, y - s / 3)
          ctx.lineTo(x + s / 3, y)
          ctx.lineTo(x, y + s / 3)
          ctx.lineTo(x - s / 3, y)
          ctx.closePath()
          ctx.fill()
        }
      }
    },
  },
]

export function patternById(id: string): PatternDef {
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS[0]
}
