import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCTS, fmtMoney } from '../shop/catalog'
import { ProductCard } from './ShopPage'

export function HomePage() {
  useEffect(() => {
    document.title = 'CanopyBargain — Custom Canopy Tents, Designed in Your Browser'
  }, [])
  const featured = PRODUCTS.filter((p) => p.badge || p.customizable).slice(0, 4)
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <h1>Your brand. On a tent.<br />Designed in 3 minutes.</h1>
          <p>
            Pick a canopy, open the free Design Studio, drop in your logo and colors, and
            watch it come to life on a live 3D model — then check out in one flow.
          </p>
          <div className="btn-row">
            <Link to="/customize" className="btn btn-primary btn-lg">Start designing — it's free</Link>
            <Link to="/shop" className="btn btn-lg">Shop all canopies</Link>
          </div>
          <ul className="trust-row">
            <li>✔ Free shipping</li>
            <li>✔ Live 3D preview</li>
            <li>✔ No design skills needed</li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 300 220">
            <ellipse cx="150" cy="196" rx="120" ry="12" fill="#c3cdd8" opacity="0.5" />
            <line x1="70" y1="112" x2="70" y2="192" stroke="#3c4450" strokeWidth="6" strokeLinecap="round" />
            <line x1="230" y1="112" x2="230" y2="192" stroke="#3c4450" strokeWidth="6" strokeLinecap="round" />
            <path d="M 150 26 L 242 100 L 58 100 Z" fill="#1d7ed8" stroke="#3c4450" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 150 26 L 186 100 L 114 100 Z" fill="#3b96e8" opacity="0.85" />
            <rect x="58" y="100" width="184" height="18" fill="#f5b301" stroke="#3c4450" strokeWidth="3" rx="3" />
            <text x="150" y="114" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1a1204" fontFamily="sans-serif">YOUR BRAND HERE</text>
            <circle cx="150" cy="62" r="14" fill="#ffffff" />
            <text x="150" y="67" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1d7ed8" fontFamily="sans-serif">★</text>
          </svg>
        </div>
      </section>

      <section className="home-section">
        <div className="section-title-row">
          <h2>Featured</h2>
          <Link to="/shop" className="muted">View all →</Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="home-section steps">
        <h2>Custom tents in three steps</h2>
        <ol className="step-row">
          <li><span className="step-n">1</span><strong>Pick your size</strong><br />10×10, 10×15, or 10×20 — from {fmtMoney(595)}.</li>
          <li><span className="step-n">2</span><strong>Design it live</strong><br />Logo, colors, patterns, curved text — on a real-time 3D tent.</li>
          <li><span className="step-n">3</span><strong>Add to cart</strong><br />Your design ships with the order. Free shipping, always.</li>
        </ol>
      </section>
    </main>
  )
}
