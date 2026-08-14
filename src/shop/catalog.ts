import type { TentSize } from '../model/types'
import raw from './products.json'

export type Category = 'custom' | 'canopy' | 'party' | 'accessory'

export interface ArtSpec {
  kind: 'canopy' | 'canopy-walls' | 'top-cover' | 'weight-bags' | 'carry-bag'
  color: string
  accent?: string
}

export interface ProductVariant {
  id: string
  label: string
  optionValues: string[]
  price: number
  compareAt: number | null
  available: boolean
  imageSrc: string | null
}

export interface Product {
  id: string
  name: string
  category: Category
  size: string | null
  price: number
  priceMax: number
  compareAt: number | null
  blurb: string
  description: string[]
  specs: Array<[string, string]>
  images: string[]
  options: string[]
  variants: ProductVariant[]
  art: ArtSpec
  customizable?: { size: TentSize }
  badge?: string
  sourceUrl: string
}

interface RawProduct {
  id: string
  name: string
  category: Category
  size: string | null
  price: number
  priceMax: number
  compareAt: number | null
  images: string[]
  options: string[]
  variants: ProductVariant[]
  tags: string[]
  productType: string | null
  customizableSize: string | null
  sourceUrl: string
}

// ---- original copy, generated per category (facts come from the data) ----

function blurbFor(p: RawProduct): string {
  const size = p.size ? `${p.size.replace('x', '×')} ft` : ''
  switch (p.category) {
    case 'custom':
      return p.customizableSize
        ? `Every panel printed with your artwork — design it live on a 3D model in our free Design Studio.`
        : `Full-color custom printing with your logo and brand colors.`
    case 'canopy':
      return `Commercial-grade ${size} instant pop-up shade that sets up in minutes.`
    case 'party':
      return `Heavy-duty ${size} frame tent for weddings, parties, and long events.`
    default:
      return `Keeps your canopy kit complete — fits the standard frames sold here.`
  }
}

function descriptionFor(p: RawProduct): string[] {
  const size = p.size ? `${p.size.replace('x', '×')} ft` : 'this'
  switch (p.category) {
    case 'custom':
      return p.customizableSize
        ? [
            `Design the whole ${size} canopy yourself: backgrounds, patterns, curved text, and logo placement, with a live 3D preview in the Design Studio. What you see is what gets printed.`,
            'Printed with full-color dye sublimation on commercial-grade fabric. Your design file is attached to the order automatically.',
          ]
        : [
            'Send us your logo and brand colors and we print them in full-color dye sublimation.',
            'A proof is confirmed with you before anything goes to production.',
          ]
    case 'canopy':
      return [
        `An instant ${size} pop-up canopy on a commercial steel frame — one-piece construction, no tools, up in minutes with two people.`,
        'Water-resistant polyester top with UV protection and adjustable height settings.',
      ]
    case 'party':
      return [
        `A ${size} frame party tent with full sidewalls for weddings, graduations, markets, and backyard events.`,
        'Heavy-duty powder-coated frame with fitted, water-resistant top and wall panels.',
      ]
    default:
      return [
        'A direct-fit accessory for the pop-up canopies and party tents in this store.',
        'Check the size in the product name against your frame before ordering.',
      ]
  }
}

function specsFor(p: RawProduct): Array<[string, string]> {
  const specs: Array<[string, string]> = []
  if (p.size) specs.push(['Footprint', `${p.size.replace('x', '×')} ft`])
  if (p.productType) specs.push(['Type', p.productType])
  if (p.options.length > 0) specs.push(['Options', p.options.join(', ')])
  if (p.variants.length > 1) specs.push(['Variants', `${p.variants.length} available`])
  if (p.category === 'custom') specs.push(['Printing', 'Full-color dye sublimation'])
  if (p.category !== 'accessory') specs.push(['Frame', 'Powder-coated steel'])
  return specs
}

const ART_COLORS = ['#1d7ed8', '#2a9d8f', '#e63946', '#7b2cbf', '#f77f00', '#264653']
function artFor(p: RawProduct): ArtSpec {
  const color = ART_COLORS[Math.abs(hash(p.id)) % ART_COLORS.length]
  const t = p.name.toLowerCase()
  if (t.includes('top cover') || t.includes('top only')) return { kind: 'top-cover', color }
  if (t.includes('weight')) return { kind: 'weight-bags', color: '#26282e' }
  if (t.includes('bag')) return { kind: 'carry-bag', color: '#26282e' }
  if (t.includes('wall')) return { kind: 'canopy-walls', color }
  return { kind: 'canopy', color, accent: '#f5b301' }
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export const PRODUCTS: Product[] = (raw as RawProduct[]).map((p) => ({
  ...p,
  blurb: blurbFor(p),
  description: descriptionFor(p),
  specs: specsFor(p),
  art: artFor(p),
  customizable: p.customizableSize ? { size: p.customizableSize as TentSize } : undefined,
  badge: p.customizableSize ? 'Design it in 3D' : undefined,
}))

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function studioProductForSize(size: TentSize): Product | undefined {
  return PRODUCTS.find((p) => p.customizable?.size === size)
}

export const CATEGORY_LABELS: Record<Category, string> = {
  custom: 'Custom Print',
  canopy: 'Pop-Up Canopies',
  party: 'Party Tents',
  accessory: 'Accessories',
}

export function fmtMoney(v: number): string {
  return v % 1 === 0 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`
}

/** Shopify CDN images accept a width param — request only the pixels we render. */
export function sizedImage(src: string, width: number): string {
  return src.includes('?') ? `${src}&width=${width}` : `${src}?width=${width}`
}

export function priceLabel(p: Product): string {
  return p.price === p.priceMax ? fmtMoney(p.price) : `${fmtMoney(p.price)}–${fmtMoney(p.priceMax)}`
}
