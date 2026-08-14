#!/usr/bin/env node
/**
 * Pulls the live product catalog from apcanopy.com's public Shopify JSON API
 * and writes src/shop/products.json in CanopyBargain's catalog shape.
 *
 * Facts only: titles, prices, variants, option names, image CDN URLs, sizes.
 * Descriptions are written by the catalog layer, not copied from the source
 * site. Images stay on the client's own Shopify CDN (hotlinked, not vendored).
 *
 * Re-run any time with: node scripts/scrape-catalog.mjs
 */
import { writeFileSync } from 'node:fs'

const SRC = 'https://www.apcanopy.com/collections/all/products.json?limit=250'

// customer-specific invoice artifacts and app-generated pseudo-products
const EXCLUDE = [/\(for [^)]*\)/i, /pay difference/i, /accessories required/i, /upgrade$/i]
const EXCLUDE_HANDLES = [/^option-set-/]

const CUSTOM_STUDIO = {
  // product handle → studio tent size (wired to the Design Studio)
  '10-x-10-custom-graphics-printed-canopy-american-phoneix': '10x10',
  '10-x-15-custom-canopy-with-your-logo-graphics': '10x15',
  '10-x-20-custom-graphics-printed-canopy-american-phoneix': '10x20',
}

function categorize(p) {
  const t = p.title.toLowerCase()
  if (t.includes('custom')) return 'custom'
  if (t.includes('party tent')) return 'party'
  if (
    t.includes('top cover') || t.includes('top only') || t.includes('carry bag') ||
    t.includes('weight bag') || t.includes('sidewall') || t.includes('side wall') ||
    t.includes('frame') || t.includes('walls only')
  ) return 'accessory'
  return 'canopy'
}

function sizeOf(title) {
  const m = title.match(/(\d+)\s*[x×]\s*(\d+)/i)
  return m ? `${m[1]}x${m[2]}` : null
}

const res = await fetch(SRC, { headers: { accept: 'application/json' } })
if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
const { products } = await res.json()

const out = []
for (const p of products) {
  if (EXCLUDE.some((re) => re.test(p.title))) continue
  if (EXCLUDE_HANDLES.some((re) => re.test(p.handle))) continue
  const variants = (p.variants ?? []).map((v) => ({
    id: String(v.id),
    label: [v.option1, v.option2, v.option3].filter((o) => o && o !== 'Default Title').join(' / ') || 'Default',
    price: Number(v.price),
    compareAt: v.compare_at_price ? Number(v.compare_at_price) : null,
    available: v.available !== false,
    imageSrc: v.featured_image?.src ?? null,
  }))
  const prices = variants.map((v) => v.price)
  out.push({
    id: p.handle,
    name: p.title.trim(),
    category: categorize(p),
    size: sizeOf(p.title),
    price: Math.min(...prices),
    priceMax: Math.max(...prices),
    compareAt: variants.find((v) => v.compareAt)?.compareAt ?? null,
    images: (p.images ?? []).map((i) => i.src),
    options: (p.options ?? []).map((o) => o.name).filter((n) => n !== 'Title'),
    variants,
    tags: p.tags ?? [],
    productType: p.product_type || null,
    customizableSize: CUSTOM_STUDIO[p.handle] ?? null,
    sourceUrl: `https://www.apcanopy.com/products/${p.handle}`,
  })
}

// stable order: custom first, then canopies by size, party, accessories
const rank = { custom: 0, canopy: 1, party: 2, accessory: 3 }
out.sort((a, b) => rank[a.category] - rank[b.category] || a.name.localeCompare(b.name))

writeFileSync(new URL('../src/shop/products.json', import.meta.url), JSON.stringify(out, null, 2))
console.log(`wrote ${out.length} products (${products.length - out.length} invoice-artifacts excluded)`)
for (const c of ['custom', 'canopy', 'party', 'accessory']) {
  console.log(`  ${c}: ${out.filter((p) => p.category === c).length}`)
}
