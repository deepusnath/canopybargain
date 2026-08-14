import type { Design, PanelDesign, PartId, TentSize } from '../model/types'
import { emptyPanel, uid } from '../model/types'

/**
 * One-click starting designs. Each template builds peak + valance panels for
 * the current tent size; applying preserves size and wall on/off state.
 * All original designs, parameterized so Quick Design colors can recolor them.
 */

export interface Template {
  id: string
  label: string
  build: () => { peak: PanelDesign; valance: PanelDesign }
}

function textLayer(
  t: string,
  o: Partial<{ sizeIn: number; color: string; font: string; arc: number; x: number; y: number; weight: 'normal' | 'bold' }> = {},
) {
  return {
    id: uid('text'),
    type: 'text' as const,
    text: t,
    font: o.font ?? 'Arial',
    sizeIn: o.sizeIn ?? 8,
    color: o.color ?? '#ffffff',
    weight: o.weight ?? 'bold',
    arc: o.arc ?? 0,
    rotation: 0,
    x: o.x ?? 0.5,
    y: o.y ?? 0.5,
  }
}

function panel(color: string, patternId?: string, colorB?: string, layers: PanelDesign['layers'] = []): PanelDesign {
  const p = emptyPanel(color)
  if (patternId) p.background.pattern = { id: patternId, colorA: color, colorB: colorB ?? '#ffffff' }
  p.layers = layers
  return p
}

export const TEMPLATES: Template[] = [
  {
    id: 'bold-stripe',
    label: 'Bold Stripe',
    build: () => ({
      peak: panel('#1d7ed8', 'stripes', '#1665af', [textLayer('YOUR BRAND', { sizeIn: 10, y: 0.55 })]),
      valance: panel('#f5b301', undefined, undefined, [textLayer('YOUR TAGLINE HERE', { sizeIn: 7, color: '#1a1204' })]),
    }),
  },
  {
    id: 'sunset-fade',
    label: 'Sunset Fade',
    build: () => ({
      peak: panel('#f77f00', 'gradient', '#e63946', [textLayer('YOUR BRAND', { sizeIn: 10, arc: 35, y: 0.5, font: 'Georgia' })]),
      valance: panel('#264653', undefined, undefined, [textLayer('EST. 2026', { sizeIn: 6.5, color: '#ffd8a8' })]),
    }),
  },
  {
    id: 'fresh-market',
    label: 'Fresh Market',
    build: () => ({
      peak: panel('#2a9d8f', 'gradient', '#1d6e63', [
        textLayer('FRESH & LOCAL', { sizeIn: 9, arc: 30, y: 0.5, font: 'Georgia' }),
        textLayer('your farm name', { sizeIn: 4.5, y: 0.68, weight: 'normal', color: '#e7f6e9' }),
      ]),
      valance: panel('#ffffff', undefined, undefined, [textLayer('FARM STAND', { sizeIn: 7, color: '#2a9d8f' })]),
    }),
  },
  {
    id: 'night-halftone',
    label: 'Night Halftone',
    build: () => ({
      peak: panel('#111111', 'dots', '#333333', [textLayer('YOUR BRAND', { sizeIn: 11, color: '#f5b301', font: 'Impact' })]),
      valance: panel('#111111', undefined, undefined, [textLayer('• PRO SERIES •', { sizeIn: 6.5, color: '#f5b301', font: 'Impact' })]),
    }),
  },
  {
    id: 'sport-chevron',
    label: 'Sport Chevron',
    build: () => ({
      peak: panel('#e63946', 'chevron', '#b02633', [textLayer('TEAM NAME', { sizeIn: 10, font: 'Impact' })]),
      valance: panel('#111111', undefined, undefined, [textLayer('HOME OF THE CHAMPIONS', { sizeIn: 6.5, font: 'Impact' })]),
    }),
  },
  {
    id: 'clean-minimal',
    label: 'Clean Minimal',
    build: () => ({
      peak: panel('#ffffff', undefined, undefined, [textLayer('your brand', { sizeIn: 8, color: '#16202b', weight: 'normal', font: 'Georgia', y: 0.6 })]),
      valance: panel('#16202b', undefined, undefined, [textLayer('quality goods · fair prices', { sizeIn: 6, weight: 'normal' })]),
    }),
  },
  {
    id: 'geo-purple',
    label: 'Geo Pop',
    build: () => ({
      peak: panel('#7b2cbf', 'diamonds', '#5f1f96', [textLayer('YOUR BRAND', { sizeIn: 10, y: 0.55 })]),
      valance: panel('#f5b301', undefined, undefined, [textLayer('★ ★ ★', { sizeIn: 7, color: '#1a1204' })]),
    }),
  },
  {
    id: 'coast-stripe',
    label: 'Coastal',
    build: () => ({
      peak: panel('#ffffff', 'stripes', '#1d7ed8', [textLayer('BEACH DAYS', { sizeIn: 9, arc: 25, color: '#16202b', y: 0.52 })]),
      valance: panel('#1d7ed8', undefined, undefined, [textLayer('SUN · SAND · SHADE', { sizeIn: 6.5 })]),
    }),
  },
]

/** Apply a template to a design, preserving size, wall enables, and name. */
export function applyTemplate(design: Design, tpl: Template): Design {
  const d: Design = JSON.parse(JSON.stringify(design))
  const { peak, valance } = tpl.build()
  d.sameOnAllSides = true
  for (let i = 0; i < 4; i++) {
    d.parts[`peak${i}` as PartId] = JSON.parse(JSON.stringify(peak))
    d.parts[`valance${i}` as PartId] = JSON.parse(JSON.stringify(valance))
  }
  for (const w of ['backWall', 'halfWallLeft', 'halfWallRight'] as PartId[]) {
    const enabled = d.parts[w].enabled
    const wallPanel: PanelDesign = JSON.parse(JSON.stringify(peak))
    wallPanel.layers = wallPanel.layers.slice(0, 1)
    wallPanel.enabled = enabled
    d.parts[w] = wallPanel
  }
  return d
}

export function templateThumbSize(_size: TentSize): { w: number; h: number } {
  return { w: 120, h: 88 }
}
