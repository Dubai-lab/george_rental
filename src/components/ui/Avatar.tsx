const SEED_COLORS = ['#D11F2C','#0B1A3D','#1F3A7A','#E9B949','#2FB875','#F26B3A','#A8121F']

interface AvatarProps {
  name:  string
  size?: number
  style?: React.CSSProperties
}

export default function Avatar({ name, size = 34, style }: AvatarProps) {
  const initials = name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xff
  const bg = SEED_COLORS[hash % SEED_COLORS.length]

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--f-display)', fontWeight: 700,
      fontSize: size * 0.4, flexShrink: 0,
      userSelect: 'none',
      ...style,
    }}>
      {initials}
    </div>
  )
}
