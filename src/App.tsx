import { useState } from 'react'
import { useStore } from './store'
import { computePrice, fmtUsd } from './model/pricing'
import { PartTabs } from './components/PartTabs'
import { Editor2D } from './components/Editor2D'
import { Sidebar } from './components/Sidebar'
import { OrderModal } from './components/OrderModal'
import { TentScene } from './three/TentScene'

export default function App() {
  const design = useStore((s) => s.design)
  const setName = useStore((s) => s.setDesignName)
  const [orderOpen, setOrderOpen] = useState(false)
  const price = computePrice(design)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">▲</span> APCanopy
        </div>
        <input
          className="design-name"
          value={design.name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Design name"
        />
        <div className="header-right">
          <span className="price" title="Live price — see breakdown in Order">{fmtUsd(price.total)}</span>
          <button className="btn btn-primary" onClick={() => setOrderOpen(true)}>
            Review & Order
          </button>
        </div>
      </header>
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
      {orderOpen && <OrderModal onClose={() => setOrderOpen(false)} />}
    </div>
  )
}
