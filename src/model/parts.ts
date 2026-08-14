import type { Design, PanelDims, PartId, TentSize } from './types'

export interface TentFrame {
  wFt: number // width (front span)
  dFt: number // depth (side span)
  eaveIn: number // ground → eave height
  riseIn: number // eave → ridge/apex vertical rise
}

export const FRAMES: Record<TentSize, TentFrame> = {
  '10x10': { wFt: 10, dFt: 10, eaveIn: 84, riseIn: 63.3 },
  '10x15': { wFt: 10, dFt: 15, eaveIn: 84, riseIn: 63.3 },
  '10x20': { wFt: 10, dFt: 20, eaveIn: 84, riseIn: 63.3 },
}

const VALANCE_H = 15
const WALL_H = 84
const HALF_WALL_H = 42

/** horizontal run from any eave edge to the ridge (hip roof, equal insets) */
export function roofRun(frame: TentFrame): number {
  return (frame.wFt * 12) / 2
}

export function roofSlant(frame: TentFrame): number {
  const run = roofRun(frame)
  return Math.sqrt(run * run + frame.riseIn * frame.riseIn)
}

/** ridge length in inches (0 for square tents → pure pyramid) */
export function ridgeLen(frame: TentFrame): number {
  return Math.max(0, (frame.dFt - frame.wFt) * 12)
}

export interface PartSpec {
  id: PartId
  label: string
  group: 'peak' | 'valance' | 'wall'
  dims: PanelDims
  optional: boolean
}

export function partSpecs(size: TentSize): Record<PartId, PartSpec> {
  const frame = FRAMES[size]
  const w = frame.wFt * 12
  const d = frame.dFt * 12
  const slant = roofSlant(frame)
  const ridge = ridgeLen(frame)
  const sideNames = ['Front', 'Right', 'Back', 'Left']

  // Peak faces: front/back are triangles (base = width). If the tent is
  // oblong, left/right faces are trapezoids whose top edge is the ridge.
  const peakDims = (i: number): PanelDims => {
    const isFrontBack = i % 2 === 0
    const base = isFrontBack ? w : d
    if (!isFrontBack && ridge > 0) {
      return { wIn: base, hIn: slant, shape: 'trapezoid', topWIn: ridge }
    }
    return { wIn: base, hIn: slant, shape: 'triangle' }
  }

  const specs = {} as Record<PartId, PartSpec>
  for (let i = 0; i < 4; i++) {
    specs[`peak${i}` as PartId] = {
      id: `peak${i}` as PartId,
      label: `${sideNames[i]} Peak`,
      group: 'peak',
      dims: peakDims(i),
      optional: false,
    }
    specs[`valance${i}` as PartId] = {
      id: `valance${i}` as PartId,
      label: `${sideNames[i]} Valance`,
      group: 'valance',
      dims: { wIn: i % 2 === 0 ? w : d, hIn: VALANCE_H, shape: 'rect' },
      optional: false,
    }
  }
  specs.backWall = {
    id: 'backWall',
    label: 'Back Wall',
    group: 'wall',
    dims: { wIn: w - 2, hIn: WALL_H, shape: 'rect' },
    optional: true,
  }
  specs.halfWallLeft = {
    id: 'halfWallLeft',
    label: 'Left Half Wall',
    group: 'wall',
    dims: { wIn: d - 2, hIn: HALF_WALL_H, shape: 'rect' },
    optional: true,
  }
  specs.halfWallRight = {
    id: 'halfWallRight',
    label: 'Right Half Wall',
    group: 'wall',
    dims: { wIn: d - 2, hIn: HALF_WALL_H, shape: 'rect' },
    optional: true,
  }
  return specs
}

export function enabledParts(design: Design): PartSpec[] {
  const specs = partSpecs(design.tentSize)
  return (Object.keys(specs) as PartId[])
    .filter((id) => !specs[id].optional || design.parts[id].enabled)
    .map((id) => specs[id])
}

export function fmtIn(v: number): string {
  const r = Math.round(v * 100) / 100
  return `${r}"`
}
