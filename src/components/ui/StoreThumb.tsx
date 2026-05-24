const PALETTES = [
  ['#D11F2C','#0B1A3D','#E9B949'],
  ['#1F3A7A','#F26B3A','#F6F1E4'],
  ['#2FB875','#0B1A3D','#F6F1E4'],
  ['#A8121F','#142658','#E9B949'],
  ['#0B1A3D','#D11F2C','#F6F1E4'],
]

interface StoreThumbProps {
  seed?:  number
  w?:     number | string
  h?:     number | string
  style?: React.CSSProperties
}

export default function StoreThumb({ seed = 0, w = 88, h = 64, style }: StoreThumbProps) {
  const p = PALETTES[seed % PALETTES.length]
  return (
    <div style={{
      width: w, height: h, borderRadius: 8, overflow: 'hidden',
      background: p[1], position: 'relative', flexShrink: 0,
      ...style,
    }}>
      <svg viewBox="0 0 88 64" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <rect x="6"  y="20" width="76" height="44" fill={p[0]} opacity="0.85" />
        <rect x="6"  y="20" width="76" height="6"  fill={p[2]} opacity="0.95" />
        <rect x="14" y="34" width="14" height="22" fill={p[1]} opacity="0.85" />
        <rect x="34" y="34" width="20" height="14" fill={p[2]} opacity="0.7" />
        <rect x="60" y="34" width="14" height="22" fill={p[1]} opacity="0.85" />
        <path d="M0 20 L44 4 L88 20 Z"            fill={p[2]} opacity="0.18" />
      </svg>
    </div>
  )
}
