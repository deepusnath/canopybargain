import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from './store'
import { computePrice, fmtUsd } from './model/pricing'
import { PartTabs } from './components/PartTabs'
import { Editor2D } from './components/Editor2D'
import { Sidebar } from './components/Sidebar'
import { OrderModal } from './components/OrderModal'
import { TentScene } from './three/TentScene'
import { useCart } from './shop/cartStore'
import { productById, studioProductForSize } from './shop/catalog'
import { partSpecs } from './model/parts'
import { renderPanel, canvasSize } from './render/panelRenderer'
import type { TentSize } from './model/types'

/** Each studio size maps to the real store product for that custom canopy. */
export function customProductIdFor(size: TentSize): string {
  return studioProductForSize(size)?.id ?? `custom-${size}`
}

function designThumbnail(): string {
  const { design } = useStore.getState()
  const spec = partSpecs(design.tentSize).peak0
  const ppi = 260 / spec.dims.wIn
  const canvas = document.createElement('canvas')
  const { w, h } = canvasSize(spec.dims, ppi)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  renderPanel(ctx, design.parts.peak0, spec.dims, { ppi })
  return canvas.toDataURL('image/png')
}

export default function ConfiguratorPage() {
  const { productId } = useParams()
  const [params] = useSearchParams()
  const editKey = params.get('edit')
  const navigate = useNavigate()

  const design = useStore((s) => s.design)
  const setName = useStore((s) => s.setDesignName)
  const setTentSize = useStore((s) => s.setTentSize)
  const loadDesign = useStore((s) => s.loadDesign)
  const addItem = useCart((s) => s.addItem)
  const removeItem = useCart((s) => s.removeItem)

  const [orderOpen, setOrderOpen] = useState(false)
  const [addedMsg, setAddedMsg] = useState(false)
  const price = computePrice(design)

  useEffect(() => {
    document.title = 'Design Studio — CanopyBargain'
  }, [])

  // Entering via a product page presets the size; entering via a cart line
  // restores that line's saved design for editing.
  useEffect(() => {
    if (editKey) {
      const line = useCart.getState().items.find((i) => i.key === editKey)
      if (line?.custom) loadDesign(JSON.parse(JSON.stringify(line.custom.design)))
      return
    }
    const product = productId ? productById(productId) : undefined
    if (product?.customizable && useStore.getState().design.tentSize !== product.customizable.size) {
      setTentSize(product.customizable.size)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, editKey])

  const addToCart = () => {
    const d = useStore.getState().design
    const pid = customProductIdFor(d.tentSize)
    if (editKey) removeItem(editKey)
    addItem(pid, {
      custom: {
        design: JSON.parse(JSON.stringify(d)),
        price: computePrice(d).total,
        thumbnail: designThumbnail(),
      },
    })
    setOrderOpen(false)
    setAddedMsg(true)
    setTimeout(() => navigate('/cart'), 650)
  }

  return (
    <div className="app config-wrap">
      <div className="studio-bar">
        <span className="studio-title">🎨 Design Studio</span>
        <input
          className="design-name"
          value={design.name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Design name"
        />
        <div className="header-right">
          <span className="price" title="Live price — breakdown in review">{fmtUsd(price.total)}</span>
          <button className="btn btn-primary" onClick={() => setOrderOpen(true)}>
            {addedMsg ? '✓ Added to cart' : 'Review & Add to Cart'}
          </button>
        </div>
      </div>
      <div className="main">
        <Sidebar />
        <section className="editor-col">
          <PartTabs />
          <Editor2D />
        </section>
        <section className="scene-col">
          <TentScene />
        </section>
      </div>
      {orderOpen && <OrderModal onClose={() => setOrderOpen(false)} onAddToCart={addToCart} />}
    </div>
  )
}
