import { Link, NavLink } from 'react-router-dom'
import { useCart, cartCount } from '../shop/cartStore'

export function SiteHeader() {
  const items = useCart((s) => s.items)
  const count = cartCount(items)
  return (
    <header className="site-top">
      <div className="promo-bar">Free shipping on every order 🇺🇸 · Code <strong>BARGAIN10</strong> saves 10%</div>
      <div className="site-header">
        <Link to="/" className="site-brand">
          <span className="brand-mark">▲</span> Canopy<span className="brand-accent">Bargain</span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/custom-tents">Custom Tents</NavLink>
          <NavLink to="/customize" className="nav-cta">Design Studio</NavLink>
        </nav>
        <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
          🛒<span className="cart-badge">{count}</span>
        </Link>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>CanopyBargain</strong> — canopybargain.com
        <p className="muted">Custom-printed canopies designed in your browser. Demo storefront — checkout does not charge real payments.</p>
      </div>
      <nav aria-label="Footer">
        <Link to="/shop">All products</Link>
        <Link to="/customize">Design Studio</Link>
        <Link to="/cart">Cart</Link>
      </nav>
    </footer>
  )
}
