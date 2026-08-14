import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import ConfiguratorPage from './App'
import { HomePage } from './pages/HomePage'
import { ShopPage, ProductPage } from './pages/ShopPage'
import { CartPage, CheckoutPage, OrderPage } from './pages/CartPage'
import { SiteHeader, SiteFooter } from './components/SiteChrome'
import './styles.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
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
          <Route path="/customize" element={<ConfiguratorPage />} />
          <Route path="/customize/:productId" element={<ConfiguratorPage />} />
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
