import type { Design, TentSize } from './types'

// Base package prices track the live store's custom-canopy products
// (see scripts/scrape-catalog.mjs); wall add-ons track the custom sidewall product.
const BASE: Record<TentSize, number> = {
  '5x5': 299,
  '10x10': 399,
  '10x15': 669,
  '10x20': 769,
}

export interface PriceItem {
  label: string
  amount: number
}

export const WALL_PRICES = { backWall: 300, halfWall: 149 }

export function basePrice(size: TentSize): number {
  return BASE[size]
}

export function computePrice(design: Design): { total: number; items: PriceItem[] } {
  const items: PriceItem[] = [
    {
      label: `${design.tentSize.replace('x', '×')} ft custom canopy (printed peaks + valances)`,
      amount: BASE[design.tentSize],
    },
  ]
  if (design.parts.backWall.enabled)
    items.push({ label: 'Full back wall (printed)', amount: WALL_PRICES.backWall })
  if (design.parts.halfWallLeft.enabled)
    items.push({ label: 'Left half wall (printed)', amount: WALL_PRICES.halfWall })
  if (design.parts.halfWallRight.enabled)
    items.push({ label: 'Right half wall (printed)', amount: WALL_PRICES.halfWall })
  const total = items.reduce((s, i) => s + i.amount, 0)
  return { total, items }
}

export function fmtUsd(v: number): string {
  return `$${v.toFixed(2)}`
}
