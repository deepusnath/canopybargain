import { useMemo } from 'react'
import { useStore } from '../store'
import { enabledParts } from '../model/parts'
import { fmtIn } from '../model/parts'
import { computePrice, fmtUsd } from '../model/pricing'
import { renderPanel, canvasSize } from '../render/panelRenderer'

function thumbnail(designPartId: string): string {
  const { design } = useStore.getState()
  const spec = enabledParts(design).find((s) => s.id === designPartId)
  if (!spec) return ''
  const ppi = 220 / spec.dims.wIn
  const canvas = document.createElement('canvas')
  const { w, h } = canvasSize(spec.dims, ppi)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  renderPanel(ctx, design.parts[spec.id], spec.dims, { ppi })
  return canvas.toDataURL('image/png')
}

export function OrderModal({
  onClose,
  onAddToCart,
}: {
  onClose: () => void
  onAddToCart?: () => void
}) {
  const design = useStore((s) => s.design)
  const parts = enabledParts(design)
  const price = computePrice(design)

  const thumbs = useMemo(
    () => Object.fromEntries(parts.map((p) => [p.id, thumbnail(p.id)])),
    // regenerate when the design object changes
    [design],
  )

  const downloadOrder = () => {
    const order = {
      generatedAt: new Date().toISOString(),
      app: 'APCanopy v1',
      design,
      pricing: price,
      parts: parts.map((p) => ({
        id: p.id,
        label: p.label,
        widthIn: p.dims.wIn,
        heightIn: p.dims.hIn,
        shape: p.dims.shape,
        backgroundColor: design.parts[p.id].background.color,
        pattern: design.parts[p.id].background.pattern ?? null,
        layerCount: design.parts[p.id].layers.length,
      })),
    }
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${design.name.replace(/\s+/g, '-')}-order.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadArtwork = () => {
    for (const p of parts) {
      const ppi = 2000 / p.dims.wIn // proportional print proof
      const canvas = document.createElement('canvas')
      const { w, h } = canvasSize(p.dims, ppi)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      renderPanel(ctx, design.parts[p.id], p.dims, { ppi })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${design.name.replace(/\s+/g, '-')}-${p.id}.png`
      a.click()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Order summary — {design.name}</h2>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <table className="order-table">
            <thead>
              <tr><th>Preview</th><th>Part</th><th>Print size</th><th>Background</th><th>Layers</th></tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id}>
                  <td><img src={thumbs[p.id]} alt={p.label} className="order-thumb" /></td>
                  <td>{p.label}</td>
                  <td>{fmtIn(p.dims.wIn)} × {fmtIn(p.dims.hIn)}</td>
                  <td>
                    <span className="swatch-inline" style={{ background: design.parts[p.id].background.color }} />
                    {design.parts[p.id].background.color}
                    {design.parts[p.id].background.pattern ? ` + ${design.parts[p.id].background.pattern!.id}` : ''}
                  </td>
                  <td>{design.parts[p.id].layers.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Pricing</h3>
          <ul className="price-list">
            {price.items.map((i) => (
              <li key={i.label}><span>{i.label}</span><span>{fmtUsd(i.amount)}</span></li>
            ))}
            <li className="price-total"><span>Total</span><span>{fmtUsd(price.total)}</span></li>
          </ul>
          <p className="muted">
            Your design file ships with the order — the print shop gets every panel exactly
            as shown here. You can also download the artwork for your records.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={downloadArtwork}>Download panel artwork (PNG)</button>
          <button className="btn" onClick={downloadOrder}>Download order JSON</button>
          {onAddToCart && (
            <button className="btn btn-primary" onClick={onAddToCart}>
              Add to cart — {fmtUsd(price.total)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
