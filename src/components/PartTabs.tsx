import { useStore } from '../store'
import type { PartId } from '../model/types'
import { partSpecs } from '../model/parts'

const GROUPS: Array<{ label: string; ids: PartId[] }> = [
  { label: 'Peaks', ids: ['peak0', 'peak1', 'peak2', 'peak3'] },
  { label: 'Valances', ids: ['valance0', 'valance1', 'valance2', 'valance3'] },
  { label: 'Walls', ids: ['backWall', 'halfWallLeft', 'halfWallRight'] },
]

const SIDE_SHORT = ['Front', 'Right', 'Back', 'Left']

export function PartTabs() {
  const activePart = useStore((s) => s.activePart)
  const setActivePart = useStore((s) => s.setActivePart)
  const design = useStore((s) => s.design)
  const setSame = useStore((s) => s.setSameOnAllSides)
  const specs = partSpecs(design.tentSize)

  const activeGroup = GROUPS.find((g) => g.ids.includes(activePart)) ?? GROUPS[0]
  const isSided = activeGroup.label !== 'Walls'

  return (
    <div className="part-tabs">
      <div className="part-groups">
        {GROUPS.map((g) => (
          <button
            key={g.label}
            className={`tab ${g === activeGroup ? 'tab-on' : ''}`}
            onClick={() => setActivePart(g.ids[0])}
          >
            {g.label}
          </button>
        ))}
        <label className="same-toggle">
          <input
            type="checkbox"
            checked={design.sameOnAllSides}
            onChange={(e) => setSame(e.target.checked)}
          />
          Same design on 4 sides
        </label>
      </div>
      <div className="part-sides">
        {activeGroup.ids.map((id, i) => {
          const spec = specs[id]
          const disabled = spec.optional && !design.parts[id].enabled
          return (
            <button
              key={id}
              className={`chip ${activePart === id ? 'chip-on' : ''} ${disabled ? 'chip-dim' : ''}`}
              onClick={() => setActivePart(id)}
              title={disabled ? `${spec.label} is turned off — enable it in the sidebar` : spec.label}
            >
              {isSided ? SIDE_SHORT[i] : spec.label}
              {disabled ? ' (off)' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
