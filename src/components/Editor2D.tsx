import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../store'
import { partSpecs, fmtIn } from '../model/parts'
import { renderPanel, layerBBox, canvasSize } from '../render/panelRenderer'
import { onImageReady } from '../render/imageCache'
import type { Layer } from '../model/types'

const EDITOR_PPI = 6
const HANDLE_R = 11 // hit radius in canvas px
const ROT_OFFSET = 32 // rotate handle distance above the selection box

type DragState =
  | { kind: 'move'; layerId: string; dx: number; dy: number }
  | { kind: 'resize'; layerId: string; startDist: number; startSizeIn?: number; startScale?: number }
  | { kind: 'rotate'; layerId: string; startAngle: number; startRotation: number }

interface SelectionGeom {
  cx: number
  cy: number
  bw: number
  bh: number
  rot: number // radians
}

export function Editor2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)

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

  const selectionGeom = (ctx: CanvasRenderingContext2D, layer: Layer): SelectionGeom => {
    const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
    const bb = layerBBox(ctx, layer, spec.dims, EDITOR_PPI)
    return {
      cx: layer.x * w,
      cy: layer.y * h,
      bw: bb.w,
      bh: bb.h,
      rot: (layer.rotation * Math.PI) / 180,
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { design: d, activePart: ap, selectedLayerId: sel } = useStore.getState()
    const sp = partSpecs(d.tentSize)[ap]
    renderPanel(ctx, d.parts[ap], sp.dims, { ppi: EDITOR_PPI, guides: true })

    // selection box + resize/rotate handles, drawn in the layer's rotated frame
    const layer = sel ? d.parts[ap].layers.find((l) => l.id === sel) : null
    if (!layer) return
    const { w, h } = canvasSize(sp.dims, EDITOR_PPI)
    const bb = layerBBox(ctx, layer, sp.dims, EDITOR_PPI)
    const cx = layer.x * w
    const cy = layer.y * h
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((layer.rotation * Math.PI) / 180)
    ctx.strokeStyle = '#2b7de9'
    ctx.lineWidth = 1.6
    ctx.setLineDash([6, 4])
    ctx.strokeRect(-bb.w / 2, -bb.h / 2, bb.w, bb.h)
    ctx.setLineDash([])
    if (!layer.locked) {
      const half = 5.5
      for (const [hx, hy] of [
        [-bb.w / 2, -bb.h / 2], [bb.w / 2, -bb.h / 2],
        [bb.w / 2, bb.h / 2], [-bb.w / 2, bb.h / 2],
      ]) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(hx - half, hy - half, half * 2, half * 2)
        ctx.strokeRect(hx - half, hy - half, half * 2, half * 2)
      }
      ctx.beginPath()
      ctx.moveTo(0, -bb.h / 2)
      ctx.lineTo(0, -bb.h / 2 - ROT_OFFSET + 7)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -bb.h / 2 - ROT_OFFSET, 7, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }, [])

  // Draw AFTER React commits: React re-applies the canvas width/height
  // attributes during render (which clears the bitmap), so painting from a
  // store subscription that fires pre-commit leaves a blank canvas whenever
  // the active part's dimensions change. Effects run post-commit.
  useEffect(() => {
    draw()
  }, [draw, design, activePart, selectedLayerId])

  useEffect(() => onImageReady(draw), [draw])

  const capture = (canvas: HTMLCanvasElement, pointerId: number) => {
    try {
      canvas.setPointerCapture(pointerId)
    } catch {
      /* synthetic or already-released pointers can't be captured — dragging still works */
    }
  }

  const toCanvasCoords = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  /** pointer position in the selected layer's rotated local frame */
  const toLocal = (g: SelectionGeom, x: number, y: number): { lx: number; ly: number } => {
    const dx = x - g.cx
    const dy = y - g.cy
    const cos = Math.cos(-g.rot)
    const sin = Math.sin(-g.rot)
    return { lx: dx * cos - dy * sin, ly: dx * sin + dy * cos }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = toCanvasCoords(e)

    // 1) handles on the current selection take priority
    const sel = panel.layers.find((l) => l.id === selectedLayerId)
    if (sel && !sel.locked) {
      const g = selectionGeom(ctx, sel)
      const { lx, ly } = toLocal(g, x, y)
      const rotX = 0
      const rotY = -g.bh / 2 - ROT_OFFSET
      if (Math.hypot(lx - rotX, ly - rotY) <= HANDLE_R) {
        dragRef.current = {
          kind: 'rotate',
          layerId: sel.id,
          startAngle: Math.atan2(y - g.cy, x - g.cx),
          startRotation: sel.rotation,
        }
        capture(canvas, e.pointerId)
        return
      }
      for (const [hx, hy] of [
        [-g.bw / 2, -g.bh / 2], [g.bw / 2, -g.bh / 2],
        [g.bw / 2, g.bh / 2], [-g.bw / 2, g.bh / 2],
      ]) {
        if (Math.hypot(lx - hx, ly - hy) <= HANDLE_R) {
          dragRef.current = {
            kind: 'resize',
            layerId: sel.id,
            startDist: Math.max(8, Math.hypot(x - g.cx, y - g.cy)),
            startSizeIn: sel.type === 'text' ? sel.sizeIn : undefined,
            startScale: sel.type === 'image' ? sel.scale : undefined,
          }
          capture(canvas, e.pointerId)
          return
        }
      }
    }

    // 2) otherwise hit-test layers, topmost first
    for (let i = panel.layers.length - 1; i >= 0; i--) {
      const layer = panel.layers[i]
      const bb = layerBBox(ctx, layer, spec.dims, EDITOR_PPI)
      const pad = 6
      if (x >= bb.x - pad && x <= bb.x + bb.w + pad && y >= bb.y - pad && y <= bb.y + bb.h + pad) {
        selectLayer(layer.id)
        if (!layer.locked) {
          const { w, h } = canvasSize(spec.dims, EDITOR_PPI)
          dragRef.current = { kind: 'move', layerId: layer.id, dx: x - layer.x * w, dy: y - layer.y * h }
          capture(canvas, e.pointerId)
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
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = toCanvasCoords(e)
    const layer = panel.layers.find((l) => l.id === drag.layerId)
    if (!layer) return
    const { w, h } = canvasSize(spec.dims, EDITOR_PPI)

    if (drag.kind === 'move') {
      updateLayer(activePart, drag.layerId, {
        x: Math.min(1, Math.max(0, (x - drag.dx) / w)),
        y: Math.min(1, Math.max(0, (y - drag.dy) / h)),
      })
      return
    }

    const cx = layer.x * w
    const cy = layer.y * h
    if (drag.kind === 'resize') {
      const f = Math.hypot(x - cx, y - cy) / drag.startDist
      if (layer.type === 'text' && drag.startSizeIn !== undefined) {
        updateLayer(activePart, drag.layerId, {
          sizeIn: Math.min(60, Math.max(1, drag.startSizeIn * f)),
        })
      } else if (layer.type === 'image' && drag.startScale !== undefined) {
        updateLayer(activePart, drag.layerId, {
          scale: Math.min(2, Math.max(0.02, drag.startScale * f)),
        })
      }
      return
    }

    // rotate
    const angle = Math.atan2(y - cy, x - cx)
    let deg = drag.startRotation + ((angle - drag.startAngle) * 180) / Math.PI
    deg = ((deg + 540) % 360) - 180
    if (e.shiftKey) deg = Math.round(deg / 15) * 15
    updateLayer(activePart, drag.layerId, { rotation: Math.round(deg) })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* pointer was never captured */
    }
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
            title={selected.locked ? 'Unlock (allow editing)' : 'Lock (prevent editing)'}
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
        <span className="legend-hint">Drag to move · corners resize · top handle rotates (Shift snaps 15°)</span>
      </div>
    </div>
  )
}
