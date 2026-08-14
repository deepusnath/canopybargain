import { useRef, useState } from 'react'
import { useStore, listSlots, saveSlot, loadSlot, deleteSlot } from '../store'
import type { Design, ImageLayer, Layer, QrLayer, ShapeLayer, TentSize, TextLayer } from '../model/types'
import { uid } from '../model/types'
import { partSpecs } from '../model/parts'
import { PATTERNS } from '../model/patterns'
import { fileToDataUrl } from '../render/imageCache'
import { imageDpi } from '../render/panelRenderer'
import { focusInlineTextInput } from './Editor2D'
import { DEMO_DESIGNS } from '../shop/demoDesigns'
import { TEMPLATES, applyTemplate, type Template } from '../shop/templates'
import { renderPanel, canvasSize } from '../render/panelRenderer'
import { useMemo } from 'react'

/** Live-rendered template thumbnail: the template's own peak, drawn small. */
function TemplateThumb({ tpl }: { tpl: Template }) {
  const src = useMemo(() => {
    const { peak } = tpl.build()
    const dims = { wIn: 120, hIn: 87.22, shape: 'triangle' as const }
    const ppi = 1.6
    const cnv = document.createElement('canvas')
    const { w, h } = canvasSize(dims, ppi)
    cnv.width = w
    cnv.height = h
    const ctx = cnv.getContext('2d')
    if (!ctx) return ''
    renderPanel(ctx, peak, dims, { ppi })
    return cnv.toDataURL('image/png')
  }, [tpl])
  return <img src={src} alt="" className="tpl-thumb-img" />
}

const PALETTE = [
  '#ffffff', '#111111', '#e63946', '#f77f00', '#fcbf49',
  '#2a9d8f', '#1d7ed8', '#264653', '#7b2cbf', '#ff7096',
]

const FONTS = ['Arial', 'Georgia', 'Impact', 'Trebuchet MS', 'Courier New', 'Times New Roman', 'Brush Script MT']

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <button className="section-head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="section-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}

function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-row">
      {PALETTE.map((c) => (
        <button
          key={c}
          className={`swatch ${value.toLowerCase() === c ? 'swatch-on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`color ${c}`}
        />
      ))}
      <input
        type="color"
        className="swatch swatch-custom"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        aria-label="custom color"
      />
    </div>
  )
}

export function Sidebar() {
  const design = useStore((s) => s.design)
  const activePart = useStore((s) => s.activePart)
  const selectedLayerId = useStore((s) => s.selectedLayerId)
  const st = useStore.getState

  const spec = partSpecs(design.tentSize)[activePart]
  const panel = design.parts[activePart]
  const selected = panel.layers.find((l) => l.id === selectedLayerId) ?? null

  const logoInputRef = useRef<HTMLInputElement>(null)
  const quickLogoRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [quick, setQuick] = useState({ brand: '', colorA: '#1d7ed8', colorB: '#111111' })
  const [quickLogo, setQuickLogo] = useState<ImageLayer | null>(null)
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [importError, setImportError] = useState('')

  // cascade new layers away from occupied spots so they never stack invisibly
  const spawnPoint = (): { x: number; y: number } => {
    let x = 0.5
    let y = 0.5
    const occupied = () =>
      panel.layers.some((l) => Math.abs(l.x - x) < 0.04 && Math.abs(l.y - y) < 0.04)
    while (occupied() && y < 0.82) {
      x = Math.min(0.82, x + 0.05)
      y = Math.min(0.82, y + 0.07)
    }
    return { x, y }
  }

  const addText = () => {
    const layer: TextLayer = {
      id: uid('text'), type: 'text', text: 'Your Text', font: 'Arial',
      sizeIn: Math.max(4, spec.dims.hIn / 8), color: '#111111', weight: 'bold',
      arc: 0, rotation: 0, ...spawnPoint(),
    }
    st().addLayer(activePart, layer)
    focusInlineTextInput() // type immediately, no hunting for the sidebar field
  }

  const addShape = (shape: ShapeLayer['shape']) => {
    const layer: ShapeLayer = {
      id: uid('shape'), type: 'shape', shape, color: '#1d7ed8', opacity: 1,
      scale: 0.2, aspect: shape === 'line' ? 0.04 : 1, rotation: 0, ...spawnPoint(),
    }
    st().addLayer(activePart, layer)
  }

  const addQr = () => {
    const url = prompt('QR code destination URL:', 'https://')
    if (!url || url === 'https://') return
    const layer: QrLayer = {
      id: uid('qr'), type: 'qr', url: url.trim(), dark: '#111111',
      scale: 0.18, rotation: 0, ...spawnPoint(),
    }
    st().addLayer(activePart, layer)
  }

  const onLogoFile = async (file: File | undefined, forQuick = false) => {
    if (!file) return
    try {
      const { dataUrl, w, h } = await fileToDataUrl(file)
      const layer: ImageLayer = {
        id: uid('image'), type: 'image', dataUrl, naturalW: w, naturalH: h,
        scale: 0.3, rotation: 0, x: 0.5, y: 0.5,
      }
      if (forQuick) setQuickLogo(layer)
      else st().addLayer(activePart, layer)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not load image')
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${design.name.replace(/\s+/g, '-')}.apcanopy.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = async (file: File | undefined) => {
    if (!file) return
    setImportError('')
    try {
      const text = await file.text()
      const d = JSON.parse(text) as Design
      if (d?.version !== 1 || !d.parts || !d.tentSize) throw new Error('Not a valid APCanopy design file')
      st().loadDesign(d)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid file')
    }
  }

  const updateSelected = (patch: Partial<Layer>) => {
    if (selected) st().updateLayer(activePart, selected.id, patch)
  }

  return (
    <aside className="sidebar">
      <Section title="Tent">
        <label className="field">
          <span>Size</span>
          <select
            value={design.tentSize}
            onChange={(e) => st().setTentSize(e.target.value as TentSize)}
          >
            <option value="5x5">5 × 5 ft</option>
            <option value="10x10">10 × 10 ft</option>
            <option value="10x15">10 × 15 ft</option>
            <option value="10x20">10 × 20 ft</option>
          </select>
        </label>
        {(['backWall', 'halfWallLeft', 'halfWallRight'] as const).map((id) => (
          <label key={id} className="check-row">
            <input
              type="checkbox"
              checked={design.parts[id].enabled}
              onChange={(e) => st().togglePart(id, e.target.checked)}
            />
            {partSpecs(design.tentSize)[id].label}
          </label>
        ))}
      </Section>

      <Section title={`${spec.label} — Background`}>
        <ColorRow
          value={panel.background.color}
          onChange={(color) =>
            st().updatePanel(activePart, (p) => ({
              ...p,
              background: { ...p.background, color, pattern: p.background.pattern && { ...p.background.pattern, colorA: color } },
            }))
          }
        />
        <div className="pattern-grid">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              className={`chip ${(panel.background.pattern?.id ?? 'none') === p.id ? 'chip-on' : ''}`}
              onClick={() =>
                st().updatePanel(activePart, (pp) => ({
                  ...pp,
                  background: {
                    ...pp.background,
                    pattern: p.id === 'none' ? undefined : {
                      id: p.id,
                      colorA: pp.background.color,
                      colorB: pp.background.pattern?.colorB ?? '#1d7ed8',
                    },
                  },
                }))
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        {panel.background.pattern && (
          <label className="field">
            <span>Pattern accent color</span>
            <ColorRow
              value={panel.background.pattern.colorB}
              onChange={(colorB) =>
                st().updatePanel(activePart, (p) => ({
                  ...p,
                  background: { ...p.background, pattern: p.background.pattern && { ...p.background.pattern, colorB } },
                }))
              }
            />
          </label>
        )}
      </Section>

      <Section title="Add to this panel">
        <div className="btn-row">
          <button className="btn" onClick={addText}>+ Text</button>
          <button className="btn" onClick={() => logoInputRef.current?.click()}>+ Logo / Image</button>
          <button className="btn" onClick={addQr}>+ QR Code</button>
          <input
            ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden
            onChange={(e) => onLogoFile(e.target.files?.[0])}
          />
        </div>
        <div className="field">
          <span>Shapes</span>
          <div className="btn-row">
            <button className="btn btn-sm" onClick={() => addShape('rect')} title="Rectangle">▮ Rect</button>
            <button className="btn btn-sm" onClick={() => addShape('circle')} title="Circle">● Circle</button>
            <button className="btn btn-sm" onClick={() => addShape('star')} title="Star">★ Star</button>
            <button className="btn btn-sm" onClick={() => addShape('line')} title="Line">─ Line</button>
          </div>
        </div>
      </Section>

      <Section title="Layers">
        {panel.layers.length === 0 && <p className="muted">No layers yet. Add text or a logo above.</p>}
        <ul className="layer-list">
          {[...panel.layers].reverse().map((l) => (
            <li key={l.id}>
              <button
                className={`layer-item ${l.id === selectedLayerId ? 'layer-on' : ''}`}
                onClick={() => st().selectLayer(l.id)}
              >
                {l.type === 'text' && `T “${l.text.slice(0, 18)}”`}
                {l.type === 'image' && '🖼 Image'}
                {l.type === 'shape' && `⬛ Shape (${l.shape})`}
                {l.type === 'qr' && `▦ QR — ${l.url.slice(0, 22)}`}
                {l.locked ? ' 🔒' : ''}
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="layer-props">
            {selected.type === 'text' && (
              <>
                <label className="field"><span>Text</span>
                  <input value={selected.text} onChange={(e) => updateSelected({ text: e.target.value })} />
                </label>
                <label className="field"><span>Font</span>
                  <select value={selected.font} onChange={(e) => updateSelected({ font: e.target.value })}>
                    {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label className="field"><span>Size ({selected.sizeIn.toFixed(1)}" tall)</span>
                  <input type="range" min={2} max={30} step={0.5} value={selected.sizeIn}
                    onChange={(e) => updateSelected({ sizeIn: Number(e.target.value) })} />
                </label>
                <label className="field"><span>Curve ({selected.arc}°)</span>
                  <input type="range" min={-180} max={180} step={5} value={selected.arc}
                    onChange={(e) => updateSelected({ arc: Number(e.target.value) })} />
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={selected.weight === 'bold'}
                    onChange={(e) => updateSelected({ weight: e.target.checked ? 'bold' : 'normal' })} />
                  Bold
                </label>
                <ColorRow value={selected.color} onChange={(color) => updateSelected({ color })} />
              </>
            )}
            {selected.type === 'image' && (
              <>
                <label className="field"><span>Scale ({(selected.scale * 100).toFixed(0)}% of panel width)</span>
                  <input type="range" min={0.05} max={1} step={0.01} value={selected.scale}
                    onChange={(e) => updateSelected({ scale: Number(e.target.value) })} />
                </label>
                {imageDpi(selected, spec.dims) < 100 && (
                  <p className="warn">⚠ Low resolution: ~{Math.round(imageDpi(selected, spec.dims))} DPI at print size. 100+ recommended.</p>
                )}
              </>
            )}
            {selected.type === 'shape' && (
              <>
                <label className="field"><span>Size ({(selected.scale * 100).toFixed(0)}% of panel width)</span>
                  <input type="range" min={0.03} max={1} step={0.01} value={selected.scale}
                    onChange={(e) => updateSelected({ scale: Number(e.target.value) })} />
                </label>
                <label className="field"><span>Opacity ({Math.round(selected.opacity * 100)}%)</span>
                  <input type="range" min={0.1} max={1} step={0.05} value={selected.opacity}
                    onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} />
                </label>
                <ColorRow value={selected.color} onChange={(color) => updateSelected({ color })} />
              </>
            )}
            {selected.type === 'qr' && (
              <>
                <label className="field"><span>Destination URL</span>
                  <input value={selected.url} onChange={(e) => updateSelected({ url: e.target.value })} />
                </label>
                <label className="field"><span>Size ({(selected.scale * 100).toFixed(0)}% of panel width)</span>
                  <input type="range" min={0.06} max={0.6} step={0.01} value={selected.scale}
                    onChange={(e) => updateSelected({ scale: Number(e.target.value) })} />
                </label>
                <ColorRow value={selected.dark} onChange={(dark) => updateSelected({ dark })} />
              </>
            )}
            <label className="field"><span>Rotation ({selected.rotation}°)</span>
              <input type="range" min={-180} max={180} step={1} value={selected.rotation}
                onChange={(e) => updateSelected({ rotation: Number(e.target.value) })} />
            </label>
            <div className="btn-row">
              <button className="btn btn-sm" onClick={() => st().moveLayer(activePart, selected.id, 1)}>Raise</button>
              <button className="btn btn-sm" onClick={() => st().moveLayer(activePart, selected.id, -1)}>Lower</button>
              <button className="btn btn-sm" onClick={() => st().duplicateLayer(activePart, selected.id)}>Duplicate</button>
              <button className="btn btn-sm btn-danger" onClick={() => st().removeLayer(activePart, selected.id)}>Delete</button>
            </div>
          </div>
        )}
      </Section>

      <Section title="🎯 Templates" defaultOpen={false}>
        <p className="muted">One-click starting designs — recolor and edit anything after applying.</p>
        <div className="tpl-grid">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              className="tpl-card"
              onClick={() => st().loadDesign(applyTemplate(st().design, tpl))}
              title={`Apply ${tpl.label}`}
            >
              <TemplateThumb tpl={tpl} />
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="✨ Quick Design" defaultOpen={false}>
        <p className="muted">Logo + two brand colors → a complete tent in one click.</p>
        <label className="field"><span>Brand name</span>
          <input value={quick.brand} placeholder="ACME Co." onChange={(e) => setQuick({ ...quick, brand: e.target.value })} />
        </label>
        <div className="btn-row">
          <button className="btn" onClick={() => quickLogoRef.current?.click()}>
            {quickLogo ? '✓ Logo ready' : 'Upload logo'}
          </button>
          <input ref={quickLogoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden
            onChange={(e) => onLogoFile(e.target.files?.[0], true)} />
        </div>
        <label className="field"><span>Primary color</span>
          <ColorRow value={quick.colorA} onChange={(colorA) => setQuick({ ...quick, colorA })} />
        </label>
        <label className="field"><span>Accent color</span>
          <ColorRow value={quick.colorB} onChange={(colorB) => setQuick({ ...quick, colorB })} />
        </label>
        <button
          className="btn btn-primary"
          onClick={() => st().quickDesign({ ...quick, logo: quickLogo ?? undefined })}
        >
          Generate design
        </button>
      </Section>

      <Section title="Save / Load" defaultOpen={false}>
        <div className="btn-row">
          <button
            className="btn"
            onClick={() => {
              const name = prompt('Save slot name:', design.name)
              if (name) {
                saveSlot(name, design)
                setSlotsVersion(slotsVersion + 1)
              }
            }}
          >
            Save slot
          </button>
          <button className="btn" onClick={exportJson}>Export file</button>
          <button className="btn" onClick={() => importRef.current?.click()}>Import file</button>
          <input ref={importRef} type="file" accept=".json,application/json" hidden
            onChange={(e) => importJson(e.target.files?.[0])} />
        </div>
        {importError && <p className="warn">⚠ {importError}</p>}
        <ul className="slot-list" data-v={slotsVersion}>
          {listSlots().map((name) => (
            <li key={name} className="slot-row">
              <span className="slot-name">{name}</span>
              <button className="btn btn-sm" onClick={() => { const d = loadSlot(name); if (d) st().loadDesign(d) }}>Load</button>
              <button className="btn btn-sm btn-danger" onClick={() => { deleteSlot(name); setSlotsVersion(slotsVersion + 1) }}>✕</button>
            </li>
          ))}
        </ul>
        <div className="field">
          <span>Sample designs</span>
          <div className="btn-row">
            {DEMO_DESIGNS.map((demo) => (
              <button
                key={demo.label}
                className="btn btn-sm"
                onClick={() => st().loadDesign(demo.build())}
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-sm" onClick={() => { if (confirm('Start over with a blank design?')) st().reset() }}>
          Reset design
        </button>
      </Section>
    </aside>
  )
}
