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

  useEffect(() => {
    draw()
    const unsub = useStore.subscribe(draw)
    const unsubImg = onImageReady(draw)
    return () => {
      unsub()
      unsubImg()
    }
  }, [draw])

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
        const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
        dragRef.current = { layerId: layer.id, dx: x - layer.x * w, dy: y - layer.y * h }
        canvas.setPointerCapture(e.pointerId)
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

  return (
    <div className="editor-wrap">
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
