import { create } from 'zustand'
import type { Design } from '../model/types'
import { productById, type Product } from './catalog'

const CART_KEY = 'canopybargain:cart'
const ORDERS_KEY = 'canopybargain:orders'

export interface CartItem {
  key: string // unique line key
  productId: string
  variantId?: string
  variantLabel?: string
  /** unit price snapped at add-to-cart time (variant-level pricing) */
  unitPrice?: number
  qty: number
  /** custom studio designs attach the full design + a preview + studio price */
  custom?: {
    design: Design
    price: number
    thumbnail: string // dataUrl of the front peak render
  }
}

export interface ShippingInfo {
  name: string
  email: string
  address: string
  apt?: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
}

export interface Order {
  id: string
  placedAt: string
  items: CartItem[]
  subtotal: number
  discount: number
  promo?: string
  total: number
  shipping: ShippingInfo
  /** webhook delivery result — 'skipped' in demo mode (no webhook configured) */
  delivery?: 'sent' | 'failed' | 'skipped'
}

export function updateOrderDelivery(id: string, delivery: NonNullable<Order['delivery']>): void {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '{}')
    if (orders[id]) {
      orders[id].delivery = delivery
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
    }
  } catch {
    /* best-effort */
  }
  if (lastOrder?.id === id) lastOrder.delivery = delivery
}

export function lineUnitPrice(item: CartItem): number {
  if (item.custom) return item.custom.price
  if (item.unitPrice !== undefined) return item.unitPrice
  return productById(item.productId)?.price ?? 0
}

export function lineName(item: CartItem): string {
  const p = productById(item.productId)
  if (!p) return 'Unknown item'
  if (item.custom) return `${p.name} — “${item.custom.design.name}”`
  if (item.variantLabel && item.variantLabel !== 'Default') return `${p.name} (${item.variantLabel})`
  return p.name
}

interface CartState {
  items: CartItem[]
  promo: string | null
  addItem: (
    productId: string,
    opts?: {
      variantId?: string
      variantLabel?: string
      unitPrice?: number
      qty?: number
      custom?: CartItem['custom']
    },
  ) => void
  setQty: (key: string, qty: number) => void
  removeItem: (key: string) => void
  clear: () => void
  applyPromo: (code: string) => boolean
}

function loadCart(): { items: CartItem[]; promo: string | null } {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.items)) return { items: parsed.items, promo: parsed.promo ?? null }
    }
  } catch {
    /* fresh cart */
  }
  return { items: [], promo: null }
}

export const useCart = create<CartState>((set, get) => ({
  ...loadCart(),

  addItem: (productId, opts = {}) =>
    set((s) => {
      const { variantId, variantLabel, unitPrice, qty = 1, custom } = opts
      // merge identical non-custom lines
      if (!custom) {
        const existing = s.items.find(
          (i) => i.productId === productId && i.variantId === variantId && !i.custom,
        )
        if (existing) {
          return {
            items: s.items.map((i) =>
              i.key === existing.key ? { ...i, qty: i.qty + qty } : i,
            ),
          }
        }
      }
      const key = `${productId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      return {
        items: [...s.items, { key, productId, variantId, variantLabel, unitPrice, qty, custom }],
      }
    }),

  setQty: (key, qty) =>
    set((s) => ({
      items:
        qty <= 0
          ? s.items.filter((i) => i.key !== key)
          : s.items.map((i) => (i.key === key ? { ...i, qty: Math.min(99, qty) } : i)),
    })),

  removeItem: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
  clear: () => set({ items: [], promo: null }),

  applyPromo: (code) => {
    const normalized = code.trim().toUpperCase()
    if (normalized === 'BARGAIN10') {
      set({ promo: normalized })
      return true
    }
    return false
  },
}))

useCart.subscribe((s) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items: s.items, promo: s.promo }))
  } catch {
    /* quota exceeded (large logo) — cart still works in-memory */
  }
})

export function cartTotals(items: CartItem[], promo: string | null) {
  const subtotal = items.reduce((sum, i) => sum + lineUnitPrice(i) * i.qty, 0)
  const discount = promo === 'BARGAIN10' ? subtotal * 0.1 : 0
  return { subtotal, discount, shipping: 0, total: subtotal - discount }
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.qty, 0)
}

// ---- orders ----

export function placeOrder(items: CartItem[], promo: string | null, shipping: ShippingInfo): Order {
  const { subtotal, discount, total } = cartTotals(items, promo)
  const order: Order = {
    id: `CB-${Date.now().toString(36).toUpperCase()}`,
    placedAt: new Date().toISOString(),
    items,
    subtotal,
    discount,
    promo: promo ?? undefined,
    total,
    shipping,
  }
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '{}')
    orders[order.id] = order
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  } catch {
    /* keep going — order page falls back to in-memory */
  }
  lastOrder = order
  return order
}

let lastOrder: Order | null = null

export function getOrder(id: string): Order | null {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '{}')
    if (orders[id]) return orders[id] as Order
  } catch {
    /* fall through */
  }
  return lastOrder?.id === id ? lastOrder : null
}
