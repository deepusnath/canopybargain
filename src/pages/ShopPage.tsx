import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PRODUCTS, CATEGORY_LABELS, fmtMoney, type Category, type Product } from '../shop/catalog'
import { ProductArt } from '../components/ProductArt'
import { useCart } from '../shop/cartStore'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      {product.badge && <span className="badge">{product.badge}</span>}
      <ProductArt art={product.art} className="card-art" />
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="muted">{product.blurb}</p>
        <div className="card-price">
          <strong>{fmtMoney(product.price)}</strong>
          {product.compareAt && <s className="muted">{fmtMoney(product.compareAt)}</s>}
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

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCart((s) => s.addItem)
  const product = PRODUCTS.find((p) => p.id === id)
  const [variantId, setVariantId] = useState(product?.variants?.[0]?.id)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    document.title = product ? `${product.name} — CanopyBargain` : 'Product — CanopyBargain'
    setVariantId(product?.variants?.[0]?.id)
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

  const variant = product.variants?.find((v) => v.id === variantId)
  const art = variant ? { ...product.art, color: variant.color } : product.art
  const related = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3)

  const add = () => {
    addItem(product.id, { variantId, qty })
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
          <ProductArt art={art} className="detail-art-svg" />
        </div>
        <div className="detail-info">
          <h1>{product.name}</h1>
          <div className="card-price detail-price">
            <strong>{fmtMoney(product.price)}</strong>
            {product.compareAt && <s className="muted">{fmtMoney(product.compareAt)}</s>}
            <span className="pill pill-green">Free shipping</span>
          </div>
          {product.description.map((d, i) => <p key={i}>{d}</p>)}

          {product.customizable ? (
            <div className="customize-cta">
              <p><strong>This tent is fully customizable.</strong> Design it in the studio — your artwork, colors, and optional walls — then add it to your cart from there.</p>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate(`/customize/${product.id}`)}
              >
                🎨 Customize in Design Studio
              </button>
            </div>
          ) : (
            <>
              {product.variants && (
                <div className="field">
                  <span>Color: {variant?.label}</span>
                  <div className="color-row">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        className={`swatch ${v.id === variantId ? 'swatch-on' : ''}`}
                        style={{ background: v.color }}
                        onClick={() => setVariantId(v.id)}
                        aria-label={v.label}
                        title={v.label}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="buy-row">
                <label className="qty-label">
                  Qty
                  <input
                    type="number" min={1} max={99} value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                  />
                </label>
                <button className="btn btn-primary btn-lg" onClick={add}>
                  {added ? '✓ Added!' : 'Add to cart'}
                </button>
                <button className="btn btn-lg" onClick={() => { addItem(product.id, { variantId, qty }); navigate('/checkout') }}>
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
