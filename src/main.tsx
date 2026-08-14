import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { HomePage } from './pages/HomePage'
import { ShopPage, ProductPage } from './pages/ShopPage'
import { CartPage, CheckoutPage, OrderPage } from './pages/CartPage'
import { SiteHeader, SiteFooter } from './components/SiteChrome'
import { initAnalytics, trackPageview } from './shop/analytics'
import './styles.css'

// app booted successfully — re-arm the stale-deploy reload guard in index.html
sessionStorage.removeItem('cb-reloaded')
initAnalytics()

// three.js + the studio only load when a customer opens the Design Studio
const ConfiguratorPage = lazy(() => import('./App'))

function StudioFallback() {
  return (
    <main className="page studio-loading">
      <p className="muted">Loading the Design Studio…</p>
    </main>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    trackPageview(pathname)
  }, [pathname])
  return null
}

function Site() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="site">
        <SiteHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:category" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route
            path="/customize"
            element={<Suspense fallback={<StudioFallback />}><ConfiguratorPage /></Suspense>}
          />
          <Route
            path="/customize/:productId"
            element={<Suspense fallback={<StudioFallback />}><ConfiguratorPage /></Suspense>}
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
        <SiteFooter />
      </div>
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Site />
  </React.StrictMode>,
)
