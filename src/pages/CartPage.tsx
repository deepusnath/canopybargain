import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useCart, cartTotals, lineUnitPrice, lineName,
  placeOrder, getOrder, updateOrderDelivery, type ShippingInfo,
} from '../shop/cartStore'
import { deliverOrder, openStripeLink, paymentConfig } from '../shop/payment'
import { track } from '../shop/analytics'
import { productById, fmtMoney, sizedImage } from '../shop/catalog'
import { ProductArt } from '../components/ProductArt'
import { useParams } from 'react-router-dom'

function LineArt({ item }: { item: ReturnType<typeof useCart.getState>['items'][number] }) {
  const product = productById(item.productId)
  if (item.custom) {
    return <img src={item.custom.thumbnail} alt="Your custom design" className="line-art line-thumb" />
  }
  if (!product) return null
  const variant = product.variants.find((v) => v.id === item.variantId)
  const src = variant?.imageSrc ?? product.images[0]
  if (src) return <img src={sizedImage(src, 220)} alt={product.name} className="line-art line-thumb" loading="lazy" />
  return <ProductArt art={product.art} className="line-art" />
}

export function CartPage() {
  const { items, promo } = useCart()
  const setQty = useCart((s) => s.setQty)
  const removeItem = useCart((s) => s.removeItem)
  const applyPromo = useCart((s) => s.applyPromo)
  const [code, setCode] = useState('')
  const [promoMsg, setPromoMsg] = useState('')
  const totals = cartTotals(items, promo)
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Cart — CanopyBargain' }, [])

  if (items.length === 0) {
    return (
      <main className="page cart-empty">
        <h1>Your cart is empty</h1>
        <p className="muted">Not sure where to start? Design a custom tent — it's free to try.</p>
        <div className="btn-row center">
          <Link to="/customize" className="btn btn-primary btn-lg">Open Design Studio</Link>
          <Link to="/shop" className="btn btn-lg">Browse products</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>Your cart</h1>
      <div className="cart-layout">
        <ul className="cart-lines">
          {items.map((item) => (
            <li key={item.key} className="cart-line">
              <LineArt item={item} />
              <div className="line-info">
                <strong>{lineName(item)}</strong>
                {item.custom && (
                  <span className="muted">
                    Custom design · {item.custom.design.tentSize.replace('x', '×')} ft
                    {item.custom.design.parts.backWall.enabled ? ' · back wall' : ''}
                    {' '}· <Link to={`/customize/${item.productId}?edit=${item.key}`}>edit design</Link>
                  </span>
                )}
                <button className="link-btn" onClick={() => removeItem(item.key)}>Remove</button>
              </div>
              <div className="line-qty">
                <button className="btn btn-sm" onClick={() => setQty(item.key, item.qty - 1)} aria-label="Decrease quantity">−</button>
                <span>{item.qty}</span>
                <button className="btn btn-sm" onClick={() => setQty(item.key, item.qty + 1)} aria-label="Increase quantity">+</button>
              </div>
              <div className="line-price">{fmtMoney(lineUnitPrice(item) * item.qty)}</div>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <h2>Summary</h2>
          <div className="promo-row">
            <input
              placeholder="Promo code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Promo code"
            />
            <button
              className="btn btn-sm"
              onClick={() => setPromoMsg(applyPromo(code) ? '✓ 10% off applied' : 'Code not recognized')}
            >
              Apply
            </button>
          </div>
          {promoMsg && <p className={promoMsg.startsWith('✓') ? 'ok' : 'warn'}>{promoMsg}</p>}
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{fmtMoney(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="ok"><dt>Discount ({promo})</dt><dd>−{fmtMoney(totals.discount)}</dd></div>}
            <div><dt>Shipping</dt><dd>Free</dd></div>
            <div className="grand"><dt>Total</dt><dd>{fmtMoney(totals.total)}</dd></div>
          </dl>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/checkout')}>
            Checkout →
          </button>
          <Link to="/shop" className="muted center-link">Continue shopping</Link>
        </aside>
      </div>
    </main>
  )
}

const EMPTY_SHIPPING: ShippingInfo = { name: '', email: '', address: '', city: '', state: '', zip: '' }

export function CheckoutPage() {
  const { items, promo } = useCart()
  const clear = useCart((s) => s.clear)
  const totals = cartTotals(items, promo)
  const [info, setInfo] = useState<ShippingInfo>(EMPTY_SHIPPING)
  const [errors, setErrors] = useState<string[]>([])
  const [placing, setPlacing] = useState(false)
  const navigate = useNavigate()
  const { webhookUrl, stripeLink } = paymentConfig()

  useEffect(() => {
    document.title = 'Checkout — CanopyBargain'
    track('begin_checkout')
  }, [])

  if (items.length === 0) {
    return (
      <main className="page cart-empty">
        <h1>Nothing to check out</h1>
        <Link to="/shop" className="btn btn-lg">Browse products</Link>
      </main>
    )
  }

  const set = (k: keyof ShippingInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo({ ...info, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (placing) return
    const problems: string[] = []
    if (info.name.trim().length < 2) problems.push('Enter your full name.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(info.email)) problems.push('Enter a valid email address.')
    if (info.address.trim().length < 5) problems.push('Enter your street address.')
    if (info.city.trim().length < 2) problems.push('Enter your city.')
    if (info.state.trim().length < 2) problems.push('Enter your state.')
    if (!/^\d{5}(-\d{4})?$/.test(info.zip.trim())) problems.push('Enter a valid ZIP code.')
    setErrors(problems)
    if (problems.length > 0) return
    setPlacing(true)
    const order = placeOrder(items, promo, info)
    track('place_order', { total: order.total })
    const delivery = await deliverOrder(order)
    updateOrderDelivery(order.id, delivery)
    openStripeLink(order.id) // no-op unless a Stripe Payment Link is configured
    clear()
    navigate(`/order/${order.id}`)
  }

  return (
    <main className="page">
      <h1>Checkout</h1>
      <p className="demo-note">Demo checkout — no payment is collected and nothing is charged.</p>
      <div className="cart-layout">
        <form className="checkout-form" onSubmit={submit} noValidate>
          <h2>Shipping</h2>
          <label className="field"><span>Full name</span><input value={info.name} onChange={set('name')} autoComplete="name" /></label>
          <label className="field"><span>Email</span><input type="email" value={info.email} onChange={set('email')} autoComplete="email" /></label>
          <label className="field"><span>Street address</span><input value={info.address} onChange={set('address')} autoComplete="street-address" /></label>
          <div className="field-row">
            <label className="field"><span>City</span><input value={info.city} onChange={set('city')} autoComplete="address-level2" /></label>
            <label className="field"><span>State</span><input value={info.state} onChange={set('state')} autoComplete="address-level1" /></label>
            <label className="field"><span>ZIP</span><input value={info.zip} onChange={set('zip')} inputMode="numeric" autoComplete="postal-code" /></label>
          </div>
          {errors.length > 0 && (
            <ul className="warn error-list">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <h2>Payment</h2>
          <div className="pay-demo">
            {stripeLink ? (
              <label className="check-row"><input type="radio" checked readOnly /> Pay securely with Stripe (opens after ordering)</label>
            ) : (
              <>
                <label className="check-row"><input type="radio" checked readOnly /> Demo payment (no charge)</label>
                <p className="muted">
                  Set VITE_STRIPE_PAYMENT_LINK to take real payments
                  {webhookUrl ? '' : ' and VITE_ORDER_WEBHOOK_URL to receive orders'} — see .env.example.
                </p>
              </>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={placing}>
            {placing ? 'Placing order…' : `Place order — ${fmtMoney(totals.total)}`}
          </button>
        </form>
        <aside className="cart-summary">
          <h2>Order</h2>
          <ul className="mini-lines">
            {items.map((i) => (
              <li key={i.key}>
                <span>{i.qty} × {lineName(i)}</span>
                <span>{fmtMoney(lineUnitPrice(i) * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{fmtMoney(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="ok"><dt>Discount</dt><dd>−{fmtMoney(totals.discount)}</dd></div>}
            <div><dt>Shipping</dt><dd>Free</dd></div>
            <div className="grand"><dt>Total</dt><dd>{fmtMoney(totals.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  )
}

export function OrderPage() {
  const { id } = useParams()
  const order = id ? getOrder(id) : null

  useEffect(() => { document.title = `Order ${id ?? ''} — CanopyBargain` }, [id])

  if (!order) {
    return (
      <main className="page cart-empty">
        <h1>Order not found</h1>
        <p className="muted">Orders live in this browser's storage. If you cleared it, the order record is gone.</p>
        <Link to="/shop" className="btn btn-lg">Back to shop</Link>
      </main>
    )
  }

  const downloadDesign = (itemKey: string) => {
    const item = order.items.find((i) => i.key === itemKey)
    if (!item?.custom) return
    const blob = new Blob([JSON.stringify({ order: order.id, design: item.custom.design }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${order.id}-${item.custom.design.name.replace(/\s+/g, '-')}.apcanopy.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <main className="page">
      <div className="order-hero">
        <h1>🎉 Order placed!</h1>
        <p>Thanks, {order.shipping.name.split(' ')[0]}. Confirmation <strong>{order.id}</strong> for {order.shipping.email}.</p>
        {order.delivery === 'sent' && <p className="ok">✓ Order delivered to the shop's fulfillment inbox.</p>}
        {order.delivery === 'failed' && (
          <p className="warn">⚠ We couldn't reach the fulfillment service — download your design files below and contact us with your order number.</p>
        )}
        {(order.delivery === 'skipped' || !order.delivery) && (
          <p className="muted">Demo order — recorded in this browser only, nothing was charged.</p>
        )}
      </div>
      <div className="cart-layout">
        <ul className="cart-lines">
          {order.items.map((item) => (
            <li key={item.key} className="cart-line">
              <LineArt item={item} />
              <div className="line-info">
                <strong>{lineName(item)}</strong>
                {item.custom && (
                  <button className="link-btn" onClick={() => downloadDesign(item.key)}>
                    ⬇ Download print-ready design file
                  </button>
                )}
              </div>
              <div className="line-qty muted">×{item.qty}</div>
              <div className="line-price">{fmtMoney(lineUnitPrice(item) * item.qty)}</div>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <h2>Receipt</h2>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{fmtMoney(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="ok"><dt>Discount ({order.promo})</dt><dd>−{fmtMoney(order.discount)}</dd></div>}
            <div><dt>Shipping</dt><dd>Free</dd></div>
            <div className="grand"><dt>Total</dt><dd>{fmtMoney(order.total)}</dd></div>
          </dl>
          <p className="muted">
            Ships to: {order.shipping.address}, {order.shipping.city}, {order.shipping.state} {order.shipping.zip}
          </p>
          <Link to="/shop" className="btn btn-block">Continue shopping</Link>
        </aside>
      </div>
    </main>
  )
}
