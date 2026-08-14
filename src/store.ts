import { create } from 'zustand'
import type { Design, Layer, PanelDesign, PartId, TentSize } from './model/types'
import { newDesign, uid, emptyPanel } from './model/types'

const AUTOSAVE_KEY = 'apcanopy:autosave'
const SLOTS_KEY = 'apcanopy:slots'

export interface AppState {
  design: Design
  activePart: PartId
  selectedLayerId: string | null
  /** bumped to force canvas re-render when async assets (images) decode */
  renderTick: number

  setDesignName: (name: string) => void
  setTentSize: (size: TentSize) => void
  setActivePart: (id: PartId) => void
  selectLayer: (id: string | null) => void
  setSameOnAllSides: (v: boolean) => void
  togglePart: (id: PartId, enabled: boolean) => void
  updatePanel: (id: PartId, fn: (p: PanelDesign) => PanelDesign) => void
  addLayer: (id: PartId, layer: Layer) => void
  updateLayer: (partId: PartId, layerId: string, patch: Partial<Layer>) => void
  removeLayer: (partId: PartId, layerId: string) => void
  moveLayer: (partId: PartId, layerId: string, dir: 1 | -1) => void
  duplicateLayer: (partId: PartId, layerId: string) => void
  quickDesign: (opts: { colorA: string; colorB: string; brand: string; logo?: Layer }) => void
  loadDesign: (d: Design) => void
  reset: () => void
  bumpRender: () => void
}

/** Which parts an edit should fan out to under "same design on 4 sides". */
function mirrorTargets(design: Design, id: PartId): PartId[] {
  if (!design.sameOnAllSides) return [id]
  if (id.startsWith('peak')) return ['peak0', 'peak1', 'peak2', 'peak3']
  if (id.startsWith('valance')) return ['valance0', 'valance1', 'valance2', 'valance3']
  return [id]
}

function clonePanel(p: PanelDesign): PanelDesign {
  return JSON.parse(JSON.stringify(p)) as PanelDesign
}

function applyToTargets(
  design: Design,
  id: PartId,
  fn: (p: PanelDesign) => PanelDesign,
): Design {
  const targets = mirrorTargets(design, id)
  const base = fn(clonePanel(design.parts[id]))
  const parts = { ...design.parts }
  for (const t of targets) {
    const next = clonePanel(base)
    next.enabled = parts[t].enabled // enabled is never mirrored
    parts[t] = next
  }
  return { ...design, parts }
}

function loadAutosave(): Design | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Design
    if (d && d.version === 1 && d.parts && d.tentSize) return d
  } catch {
    /* corrupted autosave: start fresh */
  }
  return null
}

export const useStore = create<AppState>((set, get) => ({
  design: loadAutosave() ?? newDesign(),
  activePart: 'peak0',
  selectedLayerId: null,
  renderTick: 0,

  setDesignName: (name) => set((s) => ({ design: { ...s.design, name } })),
  setTentSize: (size) => set((s) => ({ design: { ...s.design, tentSize: size } })),
  setActivePart: (id) => set({ activePart: id, selectedLayerId: null }),
  selectLayer: (id) => set({ selectedLayerId: id }),

  setSameOnAllSides: (v) =>
    set((s) => {
      let design = { ...s.design, sameOnAllSides: v }
      if (v) {
        // copy the active side's design across its group
        const id = s.activePart
        design = applyToTargets(design, id, (p) => p)
      }
      return { design }
    }),

  togglePart: (id, enabled) =>
    set((s) => {
      const parts = { ...s.design.parts, [id]: { ...s.design.parts[id], enabled } }
      return { design: { ...s.design, parts } }
    }),

  updatePanel: (id, fn) => set((s) => ({ design: applyToTargets(s.design, id, fn) })),

  addLayer: (id, layer) => {
    get().updatePanel(id, (p) => ({ ...p, layers: [...p.layers, layer] }))
    set({ selectedLayerId: layer.id })
  },

  updateLayer: (partId, layerId, patch) =>
    get().updatePanel(partId, (p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? ({ ...l, ...patch } as Layer) : l)),
    })),

  removeLayer: (partId, layerId) => {
    get().updatePanel(partId, (p) => ({
      ...p,
      layers: p.layers.filter((l) => l.id !== layerId),
    }))
    if (get().selectedLayerId === layerId) set({ selectedLayerId: null })
  },

  moveLayer: (partId, layerId, dir) =>
    get().updatePanel(partId, (p) => {
      const idx = p.layers.findIndex((l) => l.id === layerId)
      const to = idx + dir
      if (idx < 0 || to < 0 || to >= p.layers.length) return p
      const layers = [...p.layers]
      const [l] = layers.splice(idx, 1)
      layers.splice(to, 0, l)
      return { ...p, layers }
    }),

  duplicateLayer: (partId, layerId) =>
    get().updatePanel(partId, (p) => {
      const src = p.layers.find((l) => l.id === layerId)
      if (!src) return p
      const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(src.type), x: Math.min(0.95, src.x + 0.04), y: Math.min(0.95, src.y + 0.04) } as Layer
      return { ...p, layers: [...p.layers, copy] }
    }),

  quickDesign: ({ colorA, colorB, brand, logo }) =>
    set((s) => {
      const d: Design = JSON.parse(JSON.stringify(s.design))
      d.sameOnAllSides = true
      const peak: PanelDesign = emptyPanel(colorA)
      peak.background.pattern = { id: 'gradient', colorA, colorB: shade(colorA, -25) }
      if (logo) {
        peak.layers.push({ ...(JSON.parse(JSON.stringify(logo)) as Layer), id: uid('image'), x: 0.5, y: 0.72 })
      }
      const valance: PanelDesign = emptyPanel(colorB)
      if (brand.trim()) {
        valance.layers.push({
          id: uid('text'),
          type: 'text',
          text: brand.trim().toUpperCase(),
          font: 'Arial',
          sizeIn: 8,
          color: contrastText(colorB),
          weight: 'bold',
          arc: 0,
          rotation: 0,
          x: 0.5,
          y: 0.5,
        })
      }
      for (let i = 0; i < 4; i++) {
        d.parts[`peak${i}` as PartId] = clonePanel(peak)
        d.parts[`valance${i}` as PartId] = clonePanel(valance)
      }
      for (const w of ['backWall', 'halfWallLeft', 'halfWallRight'] as PartId[]) {
        const enabled = d.parts[w].enabled
        const wall = emptyPanel(colorA)
        wall.enabled = enabled
        if (logo && w === 'backWall') {
          wall.layers.push({ ...(JSON.parse(JSON.stringify(logo)) as Layer), id: uid('image'), x: 0.5, y: 0.45 })
        }
        d.parts[w] = wall
      }
      return { design: d, selectedLayerId: null }
    }),

  loadDesign: (d) => set({ design: d, activePart: 'peak0', selectedLayerId: null }),
  reset: () => set({ design: newDesign(), activePart: 'peak0', selectedLayerId: null }),
  bumpRender: () => set((s) => ({ renderTick: s.renderTick + 1 })),
}))

// ---- persistence ----

let saveTimer: ReturnType<typeof setTimeout> | null = null
useStore.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer)
  const design = state.design
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(design))
    } catch {
      /* storage full (huge images) — autosave is best-effort */
    }
  }, 500)
})

export function listSlots(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}')).sort()
  } catch {
    return []
  }
}

export function saveSlot(name: string, design: Design): void {
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}')
  slots[name] = design
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

export function loadSlot(name: string): Design | null {
  try {
    const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}')
    return (slots[name] as Design) ?? null
  } catch {
    return null
  }
}

export function deleteSlot(name: string): void {
  const slots = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '{}')
  delete slots[name]
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

// ---- small color helpers ----

export function shade(hex: string, pct: number): string {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = parseInt(full, 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((num >> 16) & 255) * (1 + pct / 100))
  const g = clamp(((num >> 8) & 255) * (1 + pct / 100))
  const b = clamp((num & 255) * (1 + pct / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function contrastText(hex: string): string {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n
  const num = parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 140 ? '#111111' : '#ffffff'
}
