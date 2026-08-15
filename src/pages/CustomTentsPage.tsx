import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCTS, fmtMoney } from '../shop/catalog'
import { ProductImage, ProductCard } from './ShopPage'
import { SizeCompareTable } from '../components/PackageBuilder'
import { FRAMES } from '../model/parts'

/**
 * Landing page for the custom print line: pitches the studio, compares the
 * four sizes, and routes into designing — more than a filtered catalog view.
 */
export function CustomTentsPage() {
  useEffect(() => {
    document.title = 'Custom Printed Tents — CanopyBargain'
  }, [])

  const studioTents = PRODUCTS.filter((p) => p.customizable).sort((a, b) => a.price - b.price)
  const otherCustom = PRODUCTS.filter((p) => p.category === 'custom' && !p.customizable).slice(0, 3)

  return (
    <main className="page">
      <section className="custom-hero">
        <div>
          <span className="pkg-step">Custom printing</span>
          <h1>Your brand, printed on every panel</h1>
          <p>
            Full-color dye-sublimation printing across peaks, valances, and walls —
            designed by you on a live 3D model, no design skills or software needed.
            Your print-ready files attach to the order automatically.
          </p>
          <div className="btn-row">
            <Link to="/customize" className="btn btn-primary btn-lg">🎨 Open the Design Studio</Link>
            <a href="#sizes" className="btn btn-lg">See sizes & prices</a>
          </div>
          <ul className="trust-row">
            <li>✔ Live 3D preview</li>
            <li>✔ Free design help</li>
            <li>✔ Free shipping</li>
          </ul>
        </div>
      </section>

      <section className="home-section" id="sizes">
        <h2>Pick your size — from {fmtMoney(studioTents[0]?.price ?? 299)}</h2>
        <div className="size-cards">
          {studioTents.map((p) => {
            const size = p.customizable!.size
            const frame = FRAMES[size]
            return (
              <div key={p.id} className="size-card">
                <div className="card-art-frame">
                  <ProductImage product={p} className="card-art" />
                </div>
                <div className="size-card-body">
                  <h3>{size.replace('x', '×')} ft</h3>
                  <p className="muted">{frame.wFt * frame.dFt} sq ft of shade · printed peaks + valances</p>
                  <strong>{fmtMoney(p.price)}</strong>
                  <div className="btn-row">
                    <Link to={`/customize/${p.id}`} className="btn btn-primary">Design it</Link>
                    <Link to={`/product/${p.id}`} className="btn">Details</Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="compare-standalone">
          <SizeCompareTable current={null} />
        </div>
      </section>

      <section className="home-section steps">
        <h2>How custom printing works</h2>
        <ol className="step-row">
          <li><span className="step-n">1</span><strong>Build your package</strong><br />Size, walls, and printing options — priced live on the product page.</li>
          <li><span className="step-n">2</span><strong>Design in 3D</strong><br />Colors, patterns, curved text, logos, even QR codes — see the finished tent before you buy.</li>
          <li><span className="step-n">3</span><strong>We print & ship free</strong><br />Your design files ride along with the order, exactly as you approved them.</li>
        </ol>
      </section>

      {otherCustom.length > 0 && (
        <section className="home-section">
          <div className="section-title-row">
            <h2>More ways to print your brand</h2>
            <Link to="/shop/custom" className="muted">All custom products →</Link>
          </div>
          <div className="product-grid">
            {otherCustom.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  )
}
