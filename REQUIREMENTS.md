# APCanopy — Product Requirements Document

**Version:** 1.0 · **Date:** 2026-08-14 · **Status:** Approved for build

APCanopy is a web-based custom canopy tent configurator. A customer designs every
printable surface of a pop-up canopy (peaks, valances, walls), sees the result on a
live interactive 3D model, gets an instant price, and can save, share, and submit
the design for production. The benchmark is ExpoPrint's tent designer; the goal is
to exceed it in speed, clarity, and design-quality guardrails.

---

## 1. Vision & Goals

**Vision.** The fastest, clearest way to go from "blank tent" to a print-ready,
brand-correct canopy design — without a designer, without downloading templates,
and without guessing what the finished tent will look like.

**Goals**
1. A first-time user produces a credible branded tent in under 3 minutes.
2. What you see in 3D is what gets printed: 2D panel art maps 1:1 onto the model.
3. Zero-install, runs in any modern browser, mobile-friendly.
4. Every design is priceable and exportable at any moment.

**Non-goals (v1)**
- Payment processing / checkout (order submission produces a quote request).
- Multi-user collaboration or accounts (local save + file export instead).
- Table covers and flags (roadmap Phase 3).

## 2. Users

| Persona | Need |
|---|---|
| Small-business owner | Brand a tent for a farmers market / trade show quickly with logo + colors |
| Marketing designer | Precise control: exact hex colors, artwork placement, bleed/safe areas |
| Print-shop operator | Reproducible spec: panel dimensions, colors, artwork positions, print-ready export |

## 3. Product Scope — Functional Requirements

### 3.1 Tent model & parts (FR-1x)

- **FR-10** Tent sizes: 10×10 ft, 10×15 ft, 10×20 ft frame presets.
- **FR-11** Configurable parts, each independently designable:
  - 4 **peak** panels (trapezoidal/triangular roof faces)
  - 4 **valance** strips (front, back, left, right)
  - Optional **full back wall**
  - Optional **half walls** (left, right)
- **FR-12** Real print dimensions per part are displayed in the editor
  (e.g. 10×10 peak ≈ 87.2" × 120", valance ≈ 116" × 15") and drive canvas aspect ratios.
- **FR-13** Parts can be toggled on/off (walls, half walls); the 3D model and price update instantly.

### 3.2 Design tools (FR-2x)

- **FR-20 Background color** per part, with a curated palette + free hex/RGB picker.
- **FR-21 Text layers**: content, font family (≥6 fonts incl. serif/sans/display),
  size, weight, color, letter-spacing, **arc/curve** amount, rotation, position.
- **FR-22 Logo/image upload**: PNG/JPG/SVG up to 10 MB, drag-position, scale, rotation.
  Low-resolution warning when effective DPI < 100 at print size.
- **FR-23 Pattern presets**: at least 6 (stripes, chevron, gradient fade, halftone, geometric, none),
  recolorable to brand colors.
- **FR-24 "Same design on all 4 sides"** toggle (mirrors the active side's design to all sides;
  turning it off forks per-side designs).
- **FR-25 Layer management**: reorder, duplicate, delete; drag directly on the 2D canvas.
- **FR-26 Guides**: bleed line (red) and safe area (green) rendered on the 2D editor;
  warning badge when a layer crosses the safe area.
- **FR-27 Quick-design mode**: pick logo + 2 brand colors → auto-generates a complete
  tent design (all peaks/valances) in one click. This is the "better than ExpoPrint" headline feature.

### 3.3 3D preview (FR-3x)

- **FR-30** Real-time 3D canopy (frame, roof, valances, walls) with orbit, zoom, pan.
- **FR-31** Every 2D edit reflects on the 3D model in < 200 ms (canvas-texture pipeline).
- **FR-32** Camera presets: front, ¾ view, side, top; auto-rotate toggle.
- **FR-33** Ground shadow + neutral environment lighting so printed colors read accurately.
- **FR-34** Graceful fallback message when WebGL is unavailable (2D editor remains fully usable).

### 3.4 Pricing & ordering (FR-4x)

- **FR-40** Live price in the header, recomputed on every config change
  (base package by size + per-option add-ons for walls/half walls + print coverage).
- **FR-41** Itemized price breakdown on demand.
- **FR-42** "Request quote / order" flow: summary screen with part list, dimensions,
  colors (hex), and design thumbnails; produces a structured order JSON + printable summary.

### 3.5 Persistence & export (FR-5x)

- **FR-50** Autosave to browser localStorage (never lose work on refresh).
- **FR-51** Named save slots; save/load/rename/delete.
- **FR-52** Export design as a `.apcanopy.json` file; import restores it exactly.
- **FR-53** Export 3D snapshot as PNG; export per-panel artwork as PNG at print-proportional resolution.

## 4. Non-Functional Requirements

- **NFR-1 Performance**: first load < 3 s on broadband; 3D ≥ 30 fps on integrated graphics; texture updates debounced.
- **NFR-2 Compatibility**: last 2 versions of Chrome/Edge/Firefox/Safari; usable at ≥ 360 px wide (editor and preview stack vertically on mobile).
- **NFR-3 Accessibility**: keyboard-reachable controls, labeled inputs, contrast ≥ 4.5:1 for UI text.
- **NFR-4 Privacy**: all design data stays client-side in v1; no uploads leave the browser.
- **NFR-5 Robustness**: malformed imports rejected with a clear message; oversized images downscaled, never crash.
- **NFR-6 Deployability**: static build, no server required; also buildable as a single self-contained HTML file.

## 5. Data Model

```ts
Design {
  version: 1
  name: string
  tentSize: '10x10' | '10x15' | '10x20'
  sameOnAllSides: boolean
  parts: {
    peaks:    PanelDesign[4]      // N, E, S, W
    valances: PanelDesign[4]
    backWall?: PanelDesign
    halfWallLeft?: PanelDesign
    halfWallRight?: PanelDesign
  }
}
PanelDesign {
  enabled: boolean
  background: { color: string, pattern?: { id, colorA, colorB } }
  layers: (TextLayer | ImageLayer)[]
}
TextLayer  { id, type:'text', text, font, sizePt, color, weight, arc, rotation, x, y }  // x,y ∈ [0,1] panel space
ImageLayer { id, type:'image', dataUrl, naturalW, naturalH, scale, rotation, x, y }
```

Panel space is normalized (0–1) so designs survive size changes; rendering maps it
to both the 2D editor canvas and the 3D texture at the part's true aspect ratio.

## 6. Architecture

- **Stack**: Vite + React + TypeScript, three.js (imperative, wrapped in one React component), zustand store.
- **Texture pipeline**: each panel renders to an offscreen 2D canvas (single shared renderer
  function used by editor and 3D) → `THREE.CanvasTexture` → material on the corresponding mesh.
  One renderer = guaranteed 2D/3D parity (FR-31, Goal 2).
- **Geometry**: procedural — peak faces as custom BufferGeometry (truncated pyramid),
  valances/walls as planes, frame as cylinders.
- **State**: single zustand store, `Design` object + UI state (active part, selected layer, camera preset).
  Autosave subscriber → localStorage (debounced 500 ms).
- **Build targets**: `dist/` static site; `build:single` produces one inlined HTML file (vite-plugin-singlefile).

## 7. Pricing Model (v1 placeholder rates)

| Item | Price |
|---|---|
| 10×10 package (frame + printed canopy: 4 peaks + 4 valances) | $595 |
| 10×15 package | $795 |
| 10×20 package | $995 |
| Full back wall (printed) | +$249 |
| Half wall (each, printed) | +$149 |

Rates live in one `pricing.ts` table so a shop can re-skin them.

## 8. Acceptance Criteria (v1 ship gate)

1. Configure size, colors, text (incl. curved), uploaded logo, pattern on any part; all visible in 3D.
2. Same-on-4-sides toggle works both directions without data loss surprises.
3. Price updates live and matches the breakdown.
4. Refresh restores the design; export → import round-trips exactly.
5. Order summary shows correct dimensions, hexes, and thumbnails.
6. Quick-design produces a complete, non-embarrassing tent from a logo + 2 colors.
7. No console errors; WebGL-less browsers get the fallback message.

## 9. Roadmap

- **Phase 2**: shape library, QR-code layer, undo/redo, shareable links (design encoded in URL), gallery templates.
- **Phase 3**: table covers & feather flags, backend (accounts, saved projects, order API, admin pricing), print-house PDF export with bleed at 150 DPI, team review comments.
