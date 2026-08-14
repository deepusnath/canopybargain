export type TentSize = '10x10' | '10x15' | '10x20'

export type PartId =
  | 'peak0' | 'peak1' | 'peak2' | 'peak3'
  | 'valance0' | 'valance1' | 'valance2' | 'valance3'
  | 'backWall' | 'halfWallLeft' | 'halfWallRight'

export const SIDE_NAMES = ['Front', 'Right', 'Back', 'Left'] as const

export type PanelShape = 'rect' | 'triangle' | 'trapezoid'

export interface PanelDims {
  wIn: number
  hIn: number
  shape: PanelShape
  /** for trapezoid: width of the top edge in inches */
  topWIn?: number
}

export interface PatternSpec {
  id: string
  colorA: string
  colorB: string
}

export interface TextLayer {
  id: string
  type: 'text'
  /** locked layers can be selected but not dragged on the canvas */
  locked?: boolean
  text: string
  font: string
  /** font size in inches at print scale */
  sizeIn: number
  color: string
  weight: 'normal' | 'bold'
  /** total arc sweep in degrees; 0 = straight, positive curves up */
  arc: number
  rotation: number
  x: number // 0..1 of panel width
  y: number // 0..1 of panel height
}

export interface ImageLayer {
  id: string
  type: 'image'
  /** locked layers can be selected but not dragged on the canvas */
  locked?: boolean
  dataUrl: string
  naturalW: number
  naturalH: number
  /** rendered width as fraction of panel width */
  scale: number
  rotation: number
  x: number
  y: number
}

export type Layer = TextLayer | ImageLayer

export interface PanelDesign {
  enabled: boolean
  background: { color: string; pattern?: PatternSpec }
  layers: Layer[]
}

export interface Design {
  version: 1
  name: string
  tentSize: TentSize
  sameOnAllSides: boolean
  parts: Record<PartId, PanelDesign>
}

export function emptyPanel(color = '#ffffff'): PanelDesign {
  return { enabled: true, background: { color }, layers: [] }
}

export function newDesign(): Design {
  const parts = {} as Record<PartId, PanelDesign>
  const ids: PartId[] = [
    'peak0', 'peak1', 'peak2', 'peak3',
    'valance0', 'valance1', 'valance2', 'valance3',
    'backWall', 'halfWallLeft', 'halfWallRight',
  ]
  for (const id of ids) parts[id] = emptyPanel()
  parts.backWall.enabled = false
  parts.halfWallLeft.enabled = false
  parts.halfWallRight.enabled = false
  return { version: 1, name: 'My Canopy', tentSize: '10x10', sameOnAllSides: true, parts }
}

let idCounter = 0
export function uid(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}
