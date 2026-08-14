import type { ArtSpec } from '../shop/catalog'

/**
 * Self-drawn flat-style product illustrations. One SVG per product kind,
 * recolorable via the art spec so color variants get matching artwork.
 */
export function ProductArt({ art, className }: { art: ArtSpec; className?: string }) {
  const c = art.color
  const accent = art.accent ?? shade(c, -20)
  const stroke = '#3c4450'
  return (
    <svg viewBox="0 0 200 150" className={className} role="img" aria-label="Product illustration">
      <defs>
        <linearGradient id={`sky-${c.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef4fa" />
          <stop offset="1" stopColor="#dce7f2" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill={`url(#sky-${c.replace('#', '')})`} rx="10" />
      <ellipse cx="100" cy="132" rx="78" ry="9" fill="#c3cdd8" opacity="0.55" />
      {art.kind === 'canopy' && <Canopy c={c} accent={accent} stroke={stroke} />}
      {art.kind === 'canopy-walls' && (
        <>
          <Canopy c={c} accent={accent} stroke={stroke} />
          <rect x="48" y="72" width="104" height="56" fill={shade(c, 35)} stroke={stroke} strokeWidth="2" />
          <line x1="100" y1="72" x2="100" y2="128" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
        </>
      )}
      {art.kind === 'top-cover' && <TopCover c={c} accent={accent} stroke={stroke} />}
      {art.kind === 'weight-bags' && <WeightBags c={c} stroke={stroke} />}
      {art.kind === 'carry-bag' && <CarryBag c={c} stroke={stroke} />}
    </svg>
  )
}

function Canopy({ c, accent, stroke }: { c: string; accent: string; stroke: string }) {
  return (
    <g>
      {/* legs */}
      <line x1="50" y1="74" x2="50" y2="130" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="150" y1="74" x2="150" y2="130" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="66" y1="70" x2="66" y2="118" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="134" y1="70" x2="134" y2="118" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      {/* peak */}
      <path d="M 100 22 L 158 66 L 42 66 Z" fill={c} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M 100 22 L 122 66 L 78 66 Z" fill={shade(c, 18)} opacity="0.75" />
      {/* valance */}
      <rect x="42" y="66" width="116" height="12" fill={accent} stroke={stroke} strokeWidth="2" rx="2" />
      <circle cx="100" cy="45" r="6" fill="#ffffff" opacity="0.85" />
    </g>
  )
}

function TopCover({ c, accent, stroke }: { c: string; accent: string; stroke: string }) {
  return (
    <g>
      <path d="M 100 30 L 162 84 L 38 84 Z" fill={c} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M 100 30 L 128 84 L 72 84 Z" fill={shade(c, 18)} opacity="0.75" />
      <rect x="38" y="84" width="124" height="14" fill={accent} stroke={stroke} strokeWidth="2" rx="2" />
      <path d="M 60 108 q 40 14 80 0" fill="none" stroke={stroke} strokeWidth="2" strokeDasharray="5 4" />
      <text x="100" y="124" textAnchor="middle" fontSize="10" fill={stroke} fontFamily="sans-serif">top only — no frame</text>
    </g>
  )
}

function WeightBags({ c, stroke }: { c: string; stroke: string }) {
  const bag = (x: number) => (
    <g key={x}>
      <path d={`M ${x} 70 q -10 4 -10 22 v 26 q 0 8 14 8 q 14 0 14 -8 v -26 q 0 -18 -10 -22 Z`} fill={c} stroke={stroke} strokeWidth="2" />
      <rect x={x - 7} y={82} width="22" height="8" fill="#f5b301" rx="2" />
    </g>
  )
  return (
    <g>
      {bag(58)}
      {bag(98)}
      {bag(138)}
      <line x1="40" y1="30" x2="40" y2="126" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M 40 30 L 96 46" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </g>
  )
}

function CarryBag({ c, stroke }: { c: string; stroke: string }) {
  return (
    <g>
      <rect x="34" y="62" width="132" height="46" rx="14" fill={c} stroke={stroke} strokeWidth="2" />
      <rect x="34" y="78" width="132" height="6" fill="#f5b301" />
      <path d="M 70 62 q 30 -22 60 0" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <circle cx="58" cy="114" r="8" fill="#2b2f36" stroke={stroke} strokeWidth="2" />
      <circle cx="142" cy="114" r="8" fill="#2b2f36" stroke={stroke} strokeWidth="2" />
      <line x1="46" y1="70" x2="46" y2="100" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
    </g>
  )
}

export function shade(hex: string, pct: number): string {
  const n = hex.replace('#', '')
  const full = n.length === 3 ? n.split('').map((ch) => ch + ch).join('') : n
  const num = parseInt(full, 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const r = clamp(((num >> 16) & 255) * (1 + pct / 100))
  const g = clamp(((num >> 8) & 255) * (1 + pct / 100))
  const b = clamp((num & 255) * (1 + pct / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
