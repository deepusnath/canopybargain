import type { TentSize } from '../model/types'

export type Category = 'custom' | 'canopy' | 'party' | 'accessory'

export interface ArtSpec {
  kind: 'canopy' | 'canopy-walls' | 'top-cover' | 'weight-bags' | 'carry-bag'
  color: string
  accent?: string
}

export interface ProductVariant {
  id: string
  label: string
  color: string
}

export interface Product {
  id: string
  name: string
  category: Category
  price: number
  compareAt?: number
  blurb: string
  description: string[]
  specs: Array<[string, string]>
  art: ArtSpec
  variants?: ProductVariant[]
  customizable?: { size: TentSize }
  badge?: string
}

export const PRODUCTS: Product[] = [
  {
    id: 'custom-10x10',
    name: 'Custom 10×10 Canopy Tent — Full Print',
    category: 'custom',
    price: 595,
    compareAt: 699,
    blurb: 'Every peak and valance printed with your design. Live 3D preview in the Design Studio.',
    description: [
      'Design every printable surface of a 10×10 pop-up canopy in our free Design Studio: backgrounds, patterns, curved text, and your logo — with a live 3D preview.',
      'Package includes the commercial-grade frame, dye-sublimation printed canopy (4 peaks + 4 valances), and a roller carry bag. Optional printed back wall and half walls available inside the studio.',
    ],
    specs: [
      ['Footprint', '10 × 10 ft'],
      ['Peak print area', '120" × 87.22" × 4'],
      ['Valance print area', '120" × 15" × 4'],
      ['Frame', 'Powder-coated steel, pop-up'],
      ['Printing', 'Full-color dye sublimation'],
      ['Includes', 'Frame, printed canopy, roller bag'],
    ],
    art: { kind: 'canopy', color: '#1d7ed8', accent: '#f5b301' },
    customizable: { size: '10x10' },
    badge: 'Best seller',
  },
  {
    id: 'custom-10x15',
    name: 'Custom 10×15 Canopy Tent — Full Print',
    category: 'custom',
    price: 795,
    compareAt: 899,
    blurb: 'More frontage for bigger booths. Fully printable, designed live in 3D.',
    description: [
      'The 10×15 gives you 50% more shade and a longer, banner-like side valance. Design the whole tent in the studio with a live 3D preview.',
      'Package includes frame, printed canopy (4 peaks + 4 valances), and roller bag. Optional printed walls available inside the studio.',
    ],
    specs: [
      ['Footprint', '10 × 15 ft'],
      ['Side peak print area', '180" × 87.22" × 2'],
      ['Side valance print area', '180" × 15" × 2'],
      ['Frame', 'Powder-coated steel, pop-up'],
      ['Printing', 'Full-color dye sublimation'],
    ],
    art: { kind: 'canopy', color: '#2a9d8f', accent: '#f5b301' },
    customizable: { size: '10x15' },
  },
  {
    id: 'custom-10x20',
    name: 'Custom 10×20 Canopy Tent — Full Print',
    category: 'custom',
    price: 995,
    compareAt: 1149,
    blurb: 'Our biggest printable canopy — a rolling billboard for your brand.',
    description: [
      'Twenty feet of printed frontage. The 10×20 is the choice for large event footprints, car shelters, and headline sponsor booths.',
      'Package includes frame, printed canopy (4 peaks + 4 valances), and roller bag. Optional printed walls available inside the studio.',
    ],
    specs: [
      ['Footprint', '10 × 20 ft'],
      ['Side peak print area', '240" × 87.22" × 2'],
      ['Side valance print area', '240" × 15" × 2'],
      ['Frame', 'Powder-coated steel, pop-up'],
      ['Printing', 'Full-color dye sublimation'],
    ],
    art: { kind: 'canopy', color: '#7b2cbf', accent: '#f5b301' },
    customizable: { size: '10x20' },
  },
  {
    id: 'classic-10x10',
    name: '10×10 Classic Pop-Up Canopy',
    category: 'canopy',
    price: 139.99,
    compareAt: 169.99,
    blurb: 'Solid-color workhorse canopy with a white commercial frame.',
    description: [
      'A no-fuss instant canopy in classic solid colors. Sets up in under five minutes with two people, and packs into the included wheeled bag.',
      'Water-resistant 500D polyester top with UV50+ protection and three adjustable height settings.',
    ],
    specs: [
      ['Footprint', '10 × 10 ft'],
      ['Top', '500D polyester, UV50+'],
      ['Frame', 'White powder-coated steel'],
      ['Heights', '3 adjustable settings'],
      ['Includes', 'Frame, top, wheeled bag, stakes'],
    ],
    art: { kind: 'canopy', color: '#e63946' },
    variants: [
      { id: 'red', label: 'Red', color: '#e63946' },
      { id: 'blue', label: 'Blue', color: '#1d7ed8' },
      { id: 'white', label: 'White', color: '#f2f2f2' },
      { id: 'black', label: 'Black', color: '#26282e' },
    ],
    badge: 'Value pick',
  },
  {
    id: 'commercial-walls-10x10',
    name: '10×10 Commercial Canopy with Sidewalls',
    category: 'canopy',
    price: 164.99,
    blurb: 'Full sidewall kit included — a pop-up booth that closes up at night.',
    description: [
      'Everything in our classic canopy plus four removable sidewalls: three solid walls and one zippered door wall.',
      'Ideal for markets and multi-day events where you want to close the booth overnight.',
    ],
    specs: [
      ['Footprint', '10 × 10 ft'],
      ['Walls', '4 removable (1 zippered door)'],
      ['Top', '500D polyester, UV50+'],
      ['Frame', 'White powder-coated steel'],
    ],
    art: { kind: 'canopy-walls', color: '#1d7ed8' },
    variants: [
      { id: 'blue', label: 'Blue', color: '#1d7ed8' },
      { id: 'white', label: 'White', color: '#f2f2f2' },
    ],
  },
  {
    id: 'picnic-5x5',
    name: '5×5 Picnic Pop-Up Canopy',
    category: 'canopy',
    price: 79.99,
    blurb: 'Grab-and-go shade for tailgates, beach days, and backyard picnics.',
    description: [
      'Our lightest canopy — one person can set it up solo. Fits in nearly any trunk.',
      'Classic colors with a white frame and included carry bag.',
    ],
    specs: [
      ['Footprint', '5 × 5 ft'],
      ['Weight', '18 lb'],
      ['Frame', 'White powder-coated steel'],
      ['Includes', 'Frame, top, carry bag'],
    ],
    art: { kind: 'canopy', color: '#2a9d8f' },
    variants: [
      { id: 'teal', label: 'Teal', color: '#2a9d8f' },
      { id: 'yellow', label: 'Yellow', color: '#fcbf49' },
      { id: 'blue', label: 'Blue', color: '#1d7ed8' },
    ],
  },
  {
    id: 'commercial-10x20',
    name: '10×20 Commercial Pop-Up Canopy',
    category: 'canopy',
    price: 209.99,
    compareAt: 249.99,
    blurb: 'Double-wide instant shelter for events, fairs, and car storage.',
    description: [
      'Two hundred square feet of instant shade with a reinforced 6-leg frame.',
      'Water-resistant top, three height settings, and a heavy-duty wheeled bag.',
    ],
    specs: [
      ['Footprint', '10 × 20 ft'],
      ['Legs', '6 reinforced legs'],
      ['Top', '500D polyester, UV50+'],
      ['Includes', 'Frame, top, wheeled bag, stakes'],
    ],
    art: { kind: 'canopy', color: '#264653' },
    variants: [
      { id: 'slate', label: 'Slate', color: '#264653' },
      { id: 'white', label: 'White', color: '#f2f2f2' },
      { id: 'red', label: 'Red', color: '#e63946' },
    ],
  },
  {
    id: 'top-cover-10x10',
    name: '10×10 Replacement Top Cover',
    category: 'accessory',
    price: 58,
    blurb: 'Refresh a sun-tired canopy — fits standard 10×10 pop-up frames.',
    description: [
      'A brand-new 500D polyester top for standard 10×10 pop-up frames (fits most major brands).',
      'UV50+ coated and seam-sealed against light rain.',
    ],
    specs: [
      ['Fits', 'Standard 10×10 pop-up frames'],
      ['Material', '500D polyester, UV50+'],
      ['Valance height', '15"'],
    ],
    art: { kind: 'top-cover', color: '#f77f00' },
    variants: [
      { id: 'orange', label: 'Orange', color: '#f77f00' },
      { id: 'blue', label: 'Blue', color: '#1d7ed8' },
      { id: 'white', label: 'White', color: '#f2f2f2' },
    ],
  },
  {
    id: 'weight-bags',
    name: 'Canopy Water Weight Bags (4-Pack)',
    category: 'accessory',
    price: 49.99,
    blurb: 'No-stake anchoring for pavement and decks — fill with water or sand.',
    description: [
      'Four leg-wrap weight bags that each hold up to 40 lb of water or sand.',
      'Essential for street fairs and anywhere you cannot stake into the ground.',
    ],
    specs: [
      ['Quantity', '4 bags'],
      ['Capacity', 'Up to 40 lb each'],
      ['Attachment', 'Wrap-around with clips'],
    ],
    art: { kind: 'weight-bags', color: '#26282e' },
  },
  {
    id: 'carry-bag',
    name: 'Canopy Roller Carry Bag (fits 10×10 / 10×15)',
    category: 'accessory',
    price: 49.99,
    blurb: 'Heavy-duty wheeled bag that swallows a full canopy kit.',
    description: [
      'Replacement roller bag with reinforced wheels, dual zippers, and side pockets for stakes and ropes.',
      'Fits folded 10×10 and 10×15 frames with tops.',
    ],
    specs: [
      ['Fits', '10×10 and 10×15 kits'],
      ['Wheels', 'Reinforced roller wheels'],
      ['Extras', 'Stake pocket, ID window'],
    ],
    art: { kind: 'carry-bag', color: '#26282e' },
  },
]

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export const CATEGORY_LABELS: Record<Category, string> = {
  custom: 'Custom Print Tents',
  canopy: 'Pop-Up Canopies',
  party: 'Party Tents',
  accessory: 'Accessories',
}

export function fmtMoney(v: number): string {
  return v % 1 === 0 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`
}
