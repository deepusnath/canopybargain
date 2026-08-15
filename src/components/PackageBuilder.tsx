import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRODUCTS, fmtMoney, type Product } from '../shop/catalog'
import { WALL_OPTIONS, FRAMES, roofSlant } from '../model/parts'
import { WALL_PRICES } from '../model/pricing'
import type { TentSize } from '../model/types'

/**
 * On-page package configurator for customizable tents: pick everything here
 * (size, printing mode, walls), watch the subtotal, then jump into the studio
 * with the whole package pre-configured. Each attribute row only appears when
 * the selected product actually supports it (WALL_OPTIONS gating).
 */
export function PackageBuilder({ product }: { product: Product }) {
  const navigate = useNavigate()
  const size = product.customizable!.size
  const walls = WALL_OPTIONS[size]
  const sizes = useMemo(
    () => PRODUCTS.filter((p) => p.customizable).sort((a, b) => a.price - b.price),
    [],
  )

  const [samePrint, setSamePrint] = useState(true)
  const [backWall, setBackWall] = useState(false)
  const [halfLeft, setHalfLeft] = useState(false)
  const [halfRight, setHalfRight] = useState(false)

  const subtotal =
    product.price +
    (backWall && walls.backWall ? WALL_PRICES.backWall : 0) +
    (halfLeft && walls.halfWalls ? WALL_PRICES.halfWall : 0) +
    (halfRight && walls.halfWalls ? WALL_PRICES.halfWall : 0)

  const startDesigning = () => {
    const wallsParam = [
      backWall && walls.backWall ? 'back' : null,
      halfLeft && walls.halfWalls ? 'left' : null,
      halfRight && walls.halfWalls ? 'right' : null,
    ].filter(Boolean).join(',')
    const params = new URLSearchParams()
    if (wallsParam) params.set('walls', wallsParam)
    params.set('same', samePrint ? '1' : '0')
    navigate(`/customize/${product.id}?${params.toString()}`)
  }

  return (
    <div className="pkg-builder">
      <div className="pkg-head">
        <span className="pkg-step">Start here</span>
        <h2>Build your tent package</h2>
      </div>

      <div className="pkg-row">
        <span className="pkg-label">1 · Size</span>
        <div className="variant-grid">
          {sizes.map((p) => {
            const s = p.customizable!.size
            return (
              <button
                key={p.id}
                className={`chip ${p.id === product.id ? 'chip-on' : ''}`}
                onClick={() => p.id !== product.id && navigate(`/product/${p.id}`)}
              >
                {s.replace('x', '×')} ft <span className="muted">{fmtMoney(p.price)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pkg-row">
        <span className="pkg-label">2 · Printing</span>
        <div className="variant-grid">
          <button className={`chip ${samePrint ? 'chip-on' : ''}`} onClick={() => setSamePrint(true)}>
            Same design on 4 sides
          </button>
          <button className={`chip ${!samePrint ? 'chip-on' : ''}`} onClick={() => setSamePrint(false)}>
            Different design per side
          </button>
        </div>
      </div>

      {walls.backWall && (
        <div className="pkg-row">
          <span className="pkg-label">3 · Back wall</span>
          <div className="variant-grid">
            <button className={`chip ${!backWall ? 'chip-on' : ''}`} onClick={() => setBackWall(false)}>
              None
            </button>
            <button className={`chip ${backWall ? 'chip-on' : ''}`} onClick={() => setBackWall(true)}>
              Printed full wall <span className="muted">+{fmtMoney(WALL_PRICES.backWall)}</span>
            </button>
          </div>
        </div>
      )}

      {walls.halfWalls && (
        <div className="pkg-row">
          <span className="pkg-label">4 · Side half walls</span>
          <div className="variant-grid">
            <button
              className={`chip ${halfLeft ? 'chip-on' : ''}`}
              onClick={() => setHalfLeft(!halfLeft)}
              aria-pressed={halfLeft}
            >
              Left <span className="muted">+{fmtMoney(WALL_PRICES.halfWall)}</span>
            </button>
            <button
              className={`chip ${halfRight ? 'chip-on' : ''}`}
              onClick={() => setHalfRight(!halfRight)}
              aria-pressed={halfRight}
            >
              Right <span className="muted">+{fmtMoney(WALL_PRICES.halfWall)}</span>
            </button>
          </div>
        </div>
      )}

      <div className="pkg-total">
        <div>
          <span className="muted">Package subtotal</span>
          <strong>{fmtMoney(subtotal)}</strong>
        </div>
        <button className="btn btn-primary btn-lg" onClick={startDesigning}>
          🎨 Design this package in 3D →
        </button>
      </div>
      <p className="muted pkg-note">
        Everything above carries into the Design Studio — you'll see this exact
        package on the live 3D model, add your artwork, and add it to the cart
        from there. Free design help available if you'd rather we do it.
      </p>

      <SizeCompareTable current={size} />
    </div>
  )
}

/** Side-by-side comparison of the customizable sizes. */
function SizeCompareTable({ current }: { current: TentSize }) {
  const rows = PRODUCTS.filter((p) => p.customizable).sort((a, b) => a.price - b.price)
  return (
    <details className="size-compare">
      <summary>Compare all sizes</summary>
      <div className="table-scroll">
        <table className="spec-table compare-table">
          <thead>
            <tr>
              <th>Size</th><th>Price</th><th>Shade</th><th>Peak print area</th><th>Half walls</th><th>Best for</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const s = p.customizable!.size
              const frame = FRAMES[s]
              const area = frame.wFt * frame.dFt
              const slant = roofSlant(frame)
              const bestFor: Record<TentSize, string> = {
                '5x5': 'Markets, sidewalks',
                '10x10': 'Standard booths',
                '10x15': 'Wide booths',
                '10x20': 'Headline booths, car shelters',
              }
              return (
                <tr key={p.id} className={s === current ? 'compare-current' : ''}>
                  <td>{s.replace('x', '×')} ft{s === current ? ' ← viewing' : ''}</td>
                  <td>{fmtMoney(p.price)}</td>
                  <td>{area} sq ft</td>
                  <td>{frame.wFt * 12}″ × {slant.toFixed(1)}″ × 4</td>
                  <td>{WALL_OPTIONS[s].halfWalls ? 'Available' : '—'}</td>
                  <td>{bestFor[s]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
