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
import { encodeDesignToParam, decodeDesignFromParam } from './shop/shareLink'
import { track } from './shop/analytics'
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

  const canUndo = useStore((s) => s.canUndo)
  const canRedo = useStore((s) => s.canRedo)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

  const [orderOpen, setOrderOpen] = useState(false)
  const [addedMsg, setAddedMsg] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const price = computePrice(design)

  useEffect(() => {
    document.title = 'Design Studio — CanopyBargain'
    track('open_studio', productId ? { product: productId } : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z or Ctrl+Y redo. Defer to the browser's
  // own undo only inside real text entry — checkboxes, radios, sliders, and
  // swatches keep focus after a click and must not swallow the shortcut.
  useEffect(() => {
    const isTextEntry = (el: HTMLElement | null): boolean => {
      if (!el) return false
      if (el.isContentEditable || el.tagName === 'TEXTAREA') return true
      return (
        el.tagName === 'INPUT' &&
        !/^(checkbox|radio|range|color|button|submit|file)$/.test((el as HTMLInputElement).type)
      )
    }
    const onKey = (e: KeyboardEvent) => {
      if (isTextEntry(e.target as HTMLElement | null)) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useStore.getState().redo()
        else useStore.getState().undo()
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault()
        useStore.getState().redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Entering via a share link loads the shared design; via a product page
  // presets the size; via a cart line restores that line's design for editing.
  const sharedParam = params.get('d')
  useEffect(() => {
    const shared = sharedParam
    if (shared) {
      decodeDesignFromParam(shared).then((d) => {
        if (d) {
          loadDesign(d)
          setShareMsg('Shared design loaded ✓')
          setTimeout(() => setShareMsg(''), 2500)
        } else {
          setShareMsg('That share link is invalid or truncated')
          setTimeout(() => setShareMsg(''), 4000)
        }
        navigate('/customize', { replace: true })
      })
      return
    }
    if (editKey) {
      const line = useCart.getState().items.find((i) => i.key === editKey)
      if (line?.custom) loadDesign(JSON.parse(JSON.stringify(line.custom.design)))
      return
    }
    const product = productId ? productById(productId) : undefined
    if (product?.customizable && useStore.getState().design.tentSize !== product.customizable.size) {
      setTentSize(product.customizable.size)
    }
    // package-builder presets: walls + printing mode chosen on the product page
    const wallsParam = params.get('walls')
    if (wallsParam !== null) {
      const chosen = wallsParam.split(',')
      const st = useStore.getState()
      st.togglePart('backWall', chosen.includes('back'))
      st.togglePart('halfWallLeft', chosen.includes('left'))
      st.togglePart('halfWallRight', chosen.includes('right'))
    }
    const sameParam = params.get('same')
    if (sameParam !== null) {
      useStore.getState().setSameOnAllSides(sameParam === '1')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, editKey, sharedParam])

  const shareDesign = async () => {
    const { param, strippedImages } = await encodeDesignToParam(useStore.getState().design)
    const url = `${location.origin}${location.pathname}#/customize?d=${param}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg(
        strippedImages > 0
          ? `Link copied ✓ (${strippedImages} uploaded image${strippedImages > 1 ? 's' : ''} not included — links can't carry uploads)`
          : 'Link copied ✓',
      )
    } catch {
      window.prompt('Copy this design link:', url)
      setShareMsg('')
    }
    setTimeout(() => setShareMsg(''), 5000)
  }

  const addToCart = () => {
    const d = useStore.getState().design
    track('add_to_cart', { product: customProductIdFor(d.tentSize), custom: 1 })
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
    <main className="app config-wrap">
      <div className="studio-bar">
        <h1 className="studio-title">🎨 Design Studio</h1>
        <input
          className="design-name"
          value={design.name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Design name"
        />
        <div className="undo-group">
          <button className="btn btn-sm btn-dark" onClick={undo} disabled={!canUndo}
            title="Undo (⌘Z)" aria-label="Undo">↩</button>
          <button className="btn btn-sm btn-dark" onClick={redo} disabled={!canRedo}
            title="Redo (⇧⌘Z)" aria-label="Redo">↪</button>
          <button className="btn btn-sm btn-dark" onClick={shareDesign}
            title="Copy a link to this design" aria-label="Share design">🔗 Share</button>
        </div>
        {shareMsg && <span className="share-msg">{shareMsg}</span>}
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
    </main>
  )
}
