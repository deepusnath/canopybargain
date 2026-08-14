import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { partSpecs, fmtIn } from '../model/parts'
import { renderPanel, layerBBox, canvasSize } from '../render/panelRenderer'
import { onImageReady } from '../render/imageCache'

const EDITOR_PPI = 6

export function Editor2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ layerId: string; dx: number; dy: number } | null>(null)

  const activePart = useStore((s) => s.activePart)
  const design = useStore((s) => s.design)
  const selectedLayerId = useStore((s) => s.selectedLayerId)
  const selectLayer = useStore((s) => s.selectLayer)
  const updateLayer = useStore((s) => s.updateLayer)
  const moveLayer = useStore((s) => s.moveLayer)
  const duplicateLayer = useStore((s) => s.duplicateLayer)
  const removeLayer = useStore((s) => s.removeLayer)

  const spec = partSpecs(design.tentSize)[activePart]
  const panel = design.parts[activePart]

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { design: d, activePart: ap, selectedLayerId: sel } = useStore.getState()
    const sp = partSpecs(d.tentSize)[ap]
    renderPanel(ctx, d.parts[ap], sp.dims, {
      ppi: EDITOR_PPI,
      guides: true,
      selectedLayerId: sel,
    })
  }, [])

  // Draw AFTER React commits: React re-applies the canvas width/height
  // attributes during render (which clears the bitmap), so painting from a
  // store subscription that fires pre-commit leaves a blank canvas whenever
  // the active part's dimensions change. Effects run post-commit.
  useEffect(() => {
    draw()
  }, [draw, design, activePart, selectedLayerId])

  useEffect(() => onImageReady(draw), [draw])

  const toCanvasCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = toCanvasCoords(e)
    // topmost layer first
    for (let i = panel.layers.length - 1; i >= 0; i--) {
      const layer = panel.layers[i]
      const bb = layerBBox(ctx, layer, spec.dims, EDITOR_PPI)
      const pad = 6
      if (x >= bb.x - pad && x <= bb.x + bb.w + pad && y >= bb.y - pad && y <= bb.y + bb.h + pad) {
        selectLayer(layer.id)
        if (!layer.locked) {
          const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
          dragRef.current = { layerId: layer.id, dx: x - layer.x * w, dy: y - layer.y * h }
          canvas.setPointerCapture(e.pointerId)
        }
        return
      }
    }
    selectLayer(null)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const canvas = canvasRef.current
    if (!drag || !canvas) return
    const { x, y } = toCanvasCoords(e)
    const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
    updateLayer(activePart, drag.layerId, {
      x: Math.min(1, Math.max(0, (x - drag.dx) / w)),
      y: Math.min(1, Math.max(0, (y - drag.dy) / h)),
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
  const selected = panel.layers.find((l) => l.id === selectedLayerId) ?? null

  return (
    <div className="editor-wrap">
      {selected && (
        <div className="canvas-toolbar" role="toolbar" aria-label="Selected layer actions">
          <button className="tool-btn" title="Bring forward" aria-label="Bring forward"
            onClick={() => moveLayer(activePart, selected.id, 1)}>⬆</button>
          <button className="tool-btn" title="Send backward" aria-label="Send backward"
            onClick={() => moveLayer(activePart, selected.id, -1)}>⬇</button>
          <span className="tool-sep" />
          <button
            className={`tool-btn ${selected.locked ? 'tool-on' : ''}`}
            title={selected.locked ? 'Unlock (allow dragging)' : 'Lock (prevent dragging)'}
            aria-label={selected.locked ? 'Unlock layer' : 'Lock layer'}
            onClick={() => updateLayer(activePart, selected.id, { locked: !selected.locked })}
          >{selected.locked ? '🔒' : '🔓'}</button>
          <button className="tool-btn" title="Duplicate" aria-label="Duplicate layer"
            onClick={() => duplicateLayer(activePart, selected.id)}>⧉</button>
          <span className="tool-sep" />
          <button className="tool-btn tool-danger" title="Delete" aria-label="Delete layer"
            onClick={() => removeLayer(activePart, selected.id)}>🗑</button>
        </div>
      )}
      <div className="editor-stage">
        <div className="editor-canvas-holder">
          <canvas
            ref={canvasRef}
            width={w}
            height={h}
            className="editor-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          <div className="dim-label dim-w">{fmtIn(spec.dims.wIn)}</div>
          <div className="dim-label dim-h">{fmtIn(spec.dims.hIn)}</div>
        </div>
      </div>
      <div className="editor-legend">
        <span><i className="legend-line legend-bleed" /> Bleed</span>
        <span><i className="legend-line legend-safe" /> Safe area</span>
        <span className="legend-hint">Drag text & logos directly on the panel</span>
      </div>
    </div>
  )
}
