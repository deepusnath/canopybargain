import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  PRODUCTS, CATEGORY_LABELS, fmtMoney, priceLabel, sizedImage,
  type Category, type Product, type ProductVariant,
} from '../shop/catalog'
import { ProductArt } from '../components/ProductArt'
import { PackageBuilder } from '../components/PackageBuilder'
import { useCart } from '../shop/cartStore'
import { track } from '../shop/analytics'

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  if (product.images.length > 0) {
    return (
      <img
        src={sizedImage(product.images[0], 480)}
        srcSet={`${sizedImage(product.images[0], 480)} 480w, ${sizedImage(product.images[0], 800)} 800w`}
        sizes="(max-width: 760px) 90vw, 300px"
        alt={product.name}
        loading="lazy"
        className={className}
      />
    )
  }
  return <ProductArt art={product.art} className={className} />
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      {product.badge && <span className="badge">{product.badge}</span>}
      <div className="card-art-frame">
        <ProductImage product={product} className="card-art" />
      </div>
      <div className="card-body">
        <h2>{product.name}</h2>
        <p className="muted">{product.blurb}</p>
        <div className="card-price">
          <strong>{priceLabel(product)}</strong>
          {product.compareAt && product.compareAt > product.priceMax && (
            <s className="muted">{fmtMoney(product.compareAt)}</s>
          )}
          {product.customizable && <span className="pill">Customizable</span>}
        </div>
      </div>
    </Link>
  )
}

const FILTERS: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'All products' },
  { id: 'custom', label: CATEGORY_LABELS.custom },
  { id: 'canopy', label: CATEGORY_LABELS.canopy },
  { id: 'party', label: CATEGORY_LABELS.party },
  { id: 'accessory', label: CATEGORY_LABELS.accessory },
]

export function ShopPage() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const active: Category | 'all' = FILTERS.find((f) => f.id === category)?.id ?? 'all'

  useEffect(() => {
    document.title = 'Shop — CanopyBargain'
  }, [])

  const shown = PRODUCTS.filter(
    (p) =>
      (active === 'all' || p.category === active) &&
      (query.trim() === '' || p.name.toLowerCase().includes(query.trim().toLowerCase())),
  )

  return (
    <main className="page">
      <div className="shop-head">
        <h1>Shop canopies</h1>
        <input
          className="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
      </div>
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${active === f.id ? 'chip-on' : ''}`}
            onClick={() => navigate(f.id === 'all' ? '/shop' : `/shop/${f.id}`)}
          >
            {f.label}
            <span className="chip-count">
              {f.id === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === f.id).length}
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted empty-note">No products match “{query}”.</p>}
      <div className="product-grid">
        {shown.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </main>
  )
}

/** Event-planning block for party tents: capacity estimates from the footprint. */
function PartyPlanner({ size }: { size: string }) {
  const m = size.match(/(\d+)\s*x\s*(\d+)/i)
  if (!m) return null
  const w = Number(m[1])
  const d = Number(m[2])
  const area = w * d
  const round5 = (v: number) => Math.max(5, Math.floor(v / 5) * 5)
  return (
    <div className="party-planner">
      <h2>Event planning guide</h2>
      <table className="spec-table">
        <tbody>
          <tr><th>Footprint</th><td>{w} × {d} ft ({area} sq ft)</td></tr>
          <tr><th>Seated dinner (round tables)</th><td>~{round5(area / 12)} guests</td></tr>
          <tr><th>Seated rows (ceremony style)</th><td>~{round5(area / 8)} guests</td></tr>
          <tr><th>Standing reception</th><td>~{round5(area / 6)} guests</td></tr>
          <tr><th>Clearance needed</th><td>{w + 6} × {d + 6} ft (stakes & ropes)</td></tr>
        </tbody>
      </table>
      <p className="muted">
        Estimates only — subtract room for a buffet, bar, stage, or dance floor,
        and check local permit rules for tents over 400 sq ft.
      </p>
    </div>
  )
}

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCart((s) => s.addItem)
  const product = PRODUCTS.find((p) => p.id === id)
  const [variantId, setVariantId] = useState<string | undefined>(undefined)
  const [imageIdx, setImageIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    document.title = product ? `${product.name} — CanopyBargain` : 'Product — CanopyBargain'
    if (product) track('view_product', { product: product.id })
    setVariantId(product?.variants.find((v) => v.available)?.id ?? product?.variants[0]?.id)
    setImageIdx(0)
    setQty(1)
    setAdded(false)
  }, [product])

  if (!product) {
    return (
      <main className="page">
        <h1>Product not found</h1>
        <Link to="/shop" className="btn">← Back to shop</Link>
      </main>
    )
  }

  const variant: ProductVariant | undefined =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const hasVariantChoices = product.variants.length > 1
  const shownPrice = variant?.price ?? product.price
  const related = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3)

  const selectVariant = (v: ProductVariant) => {
    setVariantId(v.id)
    if (v.imageSrc) {
      const idx = product.images.indexOf(v.imageSrc)
      if (idx >= 0) setImageIdx(idx)
    }
  }

  const add = () => {
    track('add_to_cart', { product: product.id })
    addItem(product.id, {
      variantId: variant?.id,
      variantLabel: variant?.label,
      unitPrice: shownPrice,
      qty,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <main className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/shop">Shop</Link> / <Link to={`/shop/${product.category}`}>{CATEGORY_LABELS[product.category]}</Link> / {product.name}
      </nav>
      <div className="product-detail">
        <div className="detail-art">
          {product.images.length > 0 ? (
            <>
              <img
                src={sizedImage(product.images[Math.min(imageIdx, product.images.length - 1)], 1000)}
                alt={product.name}
                className="detail-photo"
              />
              {product.images.length > 1 && (
                <div className="thumb-row" role="listbox" aria-label="Product images">
                  {product.images.slice(0, 8).map((src, i) => (
                    <button
                      key={src}
                      className={`thumb ${i === imageIdx ? 'thumb-on' : ''}`}
                      onClick={() => setImageIdx(i)}
                      aria-label={`Image ${i + 1}`}
                    >
                      <img src={sizedImage(src, 120)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <ProductArt art={product.art} className="detail-art-svg" />
          )}
        </div>
        <div className="detail-info">
          <h1>{product.name}</h1>
          <div className="card-price detail-price">
            <strong>{fmtMoney(shownPrice)}</strong>
            {variant?.compareAt && variant.compareAt > shownPrice && (
              <s className="muted">{fmtMoney(variant.compareAt)}</s>
            )}
            <span className="pill pill-green">Free shipping</span>
          </div>
          {product.description.map((d, i) => <p key={i}>{d}</p>)}

          {product.customizable ? (
            <PackageBuilder product={product} />
          ) : (
            <>
              {hasVariantChoices && product.options.length >= 2 ? (
                // grouped selectors: one row per option axis (e.g. Size, Color)
                product.options.map((optName, axis) => {
                  const values = [...new Set(product.variants.map((v) => v.optionValues[axis]))]
                  const current = variant?.optionValues[axis]
                  const pick = (value: string) => {
                    // keep other axes, swap this one; fall back to any variant with this value
                    const want = variant?.optionValues.map((ov, i) => (i === axis ? value : ov)) ?? []
                    const exact = product.variants.find((v) => v.optionValues.every((ov, i) => ov === want[i]))
                    const fallback = product.variants.find((v) => v.optionValues[axis] === value)
                    if (exact ?? fallback) selectVariant(exact ?? fallback!)
                  }
                  return (
                    <div className="field" key={optName}>
                      <span>{optName}: {current}</span>
                      <div className="variant-grid">
                        {values.map((value) => {
                          const want = variant?.optionValues.map((ov, i) => (i === axis ? value : ov)) ?? []
                          const match = product.variants.find((v) => v.optionValues.every((ov, i) => ov === want[i]))
                          const anyAvailable = product.variants.some((v) => v.optionValues[axis] === value && v.available)
                          const outOfStock = match ? !match.available : !anyAvailable
                          return (
                            <button
                              key={value}
                              className={`chip ${value === current ? 'chip-on' : ''} ${outOfStock ? 'chip-dim' : ''}`}
                              onClick={() => pick(value)}
                              disabled={outOfStock}
                              title={outOfStock ? `${value} — out of stock` : value}
                            >
                              {value}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : hasVariantChoices ? (
                <div className="field">
                  <span>{product.options.join(' / ') || 'Options'}: {variant?.label}</span>
                  <div className="variant-grid">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        className={`chip ${v.id === variant?.id ? 'chip-on' : ''} ${v.available ? '' : 'chip-dim'}`}
                        onClick={() => selectVariant(v)}
                        disabled={!v.available}
                        title={v.available ? `${v.label} — ${fmtMoney(v.price)}` : `${v.label} — out of stock`}
                      >
                        {v.label}
                        {v.price !== product.price && <span className="muted"> {fmtMoney(v.price)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="buy-row">
                <label className="qty-label">
                  Qty
                  <input
                    type="number" min={1} max={99} value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  />
                </label>
                <button className="btn btn-primary btn-lg" onClick={add} disabled={variant ? !variant.available : false}>
                  {added ? '✓ Added!' : 'Add to cart'}
                </button>
                <button
                  className="btn btn-lg"
                  onClick={() => {
                    addItem(product.id, { variantId: variant?.id, variantLabel: variant?.label, unitPrice: shownPrice, qty })
                    navigate('/checkout')
                  }}
                >
                  Buy now
                </button>
              </div>
            </>
          )}

          <table className="spec-table">
            <tbody>
              {product.specs.map(([k, v]) => (
                <tr key={k}><th>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
          {product.category === 'party' && product.size && <PartyPlanner size={product.size} />}
        </div>
      </div>
      {related.length > 0 && (
        <section className="home-section">
          <h2>You might also like</h2>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  )
}
