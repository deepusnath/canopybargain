import type { Design, PanelDesign, PartId } from '../model/types'
import { newDesign, uid } from '../model/types'

/**
 * Two polished built-in designs for demos: loadable from Save/Load in any
 * browser (no localStorage needed). Built entirely from text + patterns so
 * they carry no image payloads.
 */

function panel(p: Partial<PanelDesign> & { color: string }): PanelDesign {
  return {
    enabled: true,
    background: { color: p.color, pattern: p.background?.pattern },
    layers: p.layers ?? [],
    ...(p.background ? { background: p.background } : {}),
  } as PanelDesign
}

function text(
  t: string,
  opts: Partial<{ sizeIn: number; color: string; font: string; arc: number; x: number; y: number; weight: 'normal' | 'bold' }>,
) {
  return {
    id: uid('text'),
    type: 'text' as const,
    text: t,
    font: opts.font ?? 'Arial',
    sizeIn: opts.sizeIn ?? 8,
    color: opts.color ?? '#ffffff',
    weight: opts.weight ?? 'bold',
    arc: opts.arc ?? 0,
    rotation: 0,
    x: opts.x ?? 0.5,
    y: opts.y ?? 0.5,
  }
}

export function demoCraftFair(): Design {
  const d = newDesign()
  d.name = 'Harvest & Hive Market'
  d.tentSize = '10x10'
  d.sameOnAllSides = true
  const peak = panel({
    color: '#2a9d8f',
    background: { color: '#2a9d8f', pattern: { id: 'gradient', colorA: '#2a9d8f', colorB: '#1d6e63' } },
    layers: [
      text('HARVEST & HIVE', { sizeIn: 11, arc: 40, y: 0.52, font: 'Georgia' }),
      text('local honey · handmade goods', { sizeIn: 4.5, y: 0.72, weight: 'normal', color: '#ffe9b3' }),
    ],
  })
  const valance = panel({
    color: '#264653',
    layers: [text('FARMERS MARKET · SAT + SUN', { sizeIn: 7, color: '#ffe9b3' })],
  })
  for (let i = 0; i < 4; i++) {
    d.parts[`peak${i}` as PartId] = JSON.parse(JSON.stringify(peak))
    d.parts[`valance${i}` as PartId] = JSON.parse(JSON.stringify(valance))
  }
  return d
}

export function demoBoldSport(): Design {
  const d = newDesign()
  d.name = 'Summit Athletics'
  d.tentSize = '10x15'
  d.sameOnAllSides = true
  const peak = panel({
    color: '#111111',
    background: { color: '#111111', pattern: { id: 'stripes', colorA: '#111111', colorB: '#1d1d1d' } },
    layers: [
      text('SUMMIT', { sizeIn: 16, color: '#f5b301', font: 'Impact', y: 0.5 }),
      text('ATHLETICS', { sizeIn: 7, color: '#ffffff', y: 0.68, font: 'Impact' }),
    ],
  })
  const valance = panel({
    color: '#f5b301',
    layers: [text('TRAIN HARD · RACE EASY', { sizeIn: 7.5, color: '#111111', font: 'Impact' })],
  })
  for (let i = 0; i < 4; i++) {
    d.parts[`peak${i}` as PartId] = JSON.parse(JSON.stringify(peak))
    d.parts[`valance${i}` as PartId] = JSON.parse(JSON.stringify(valance))
  }
  d.parts.backWall = panel({
    color: '#111111',
    layers: [text('SUMMIT', { sizeIn: 20, color: '#f5b301', font: 'Impact', y: 0.4 })],
  })
  d.parts.backWall.enabled = true
  return d
}

export const DEMO_DESIGNS: Array<{ label: string; build: () => Design }> = [
  { label: 'Harvest & Hive (craft fair)', build: demoCraftFair },
  { label: 'Summit Athletics (bold sport)', build: demoBoldSport },
]
