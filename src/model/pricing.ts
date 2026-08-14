import type { Design, TentSize } from './types'

const BASE: Record<TentSize, number> = {
  '10x10': 595,
  '10x15': 795,
  '10x20': 995,
}

export interface PriceItem {
  label: string
  amount: number
}

export function computePrice(design: Design): { total: number; items: PriceItem[] } {
  const items: PriceItem[] = [
    {
      label: `${design.tentSize.replace('x', '×')} ft package (frame + printed peaks & valances)`,
      amount: BASE[design.tentSize],
    },
  ]
  if (design.parts.backWall.enabled) items.push({ label: 'Full back wall (printed)', amount: 249 })
  if (design.parts.halfWallLeft.enabled) items.push({ label: 'Left half wall (printed)', amount: 149 })
  if (design.parts.halfWallRight.enabled) items.push({ label: 'Right half wall (printed)', amount: 149 })
  const total = items.reduce((s, i) => s + i.amount, 0)
  return { total, items }
}

export function fmtUsd(v: number): string {
  return `$${v.toFixed(2)}`
}
