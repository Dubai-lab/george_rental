import { CSSProperties, ReactNode } from 'react'

type Tone = 'mint' | 'rust' | 'gold' | 'navy' | 'crimson' | 'cream' | 'gray'

const tones: Record<Tone, { bg: string; fg: string; dot: string }> = {
  mint:    { bg: 'rgba(47,184,117,0.10)',  fg: '#1F7D4F', dot: '#2FB875' },
  rust:    { bg: 'rgba(192,74,42,0.10)',   fg: '#8C3719', dot: '#C04A2A' },
  gold:    { bg: 'rgba(233,185,73,0.16)',  fg: '#7A5A14', dot: '#E9B949' },
  navy:    { bg: 'rgba(11,26,61,0.07)',    fg: '#0B1A3D', dot: '#0B1A3D' },
  crimson: { bg: 'rgba(209,31,44,0.10)',   fg: '#A8121F', dot: '#D11F2C' },
  cream:   { bg: 'rgba(246,241,228,0.10)', fg: '#F6F1E4', dot: '#F6F1E4' },
  gray:    { bg: 'rgba(11,26,61,0.06)',    fg: '#6E6755', dot: '#6E6755' },
}

interface PillProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  style?: CSSProperties
}

export default function Pill({ tone = 'mint', dot = true, children, style }: PillProps) {
  const t = tones[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 500,
      letterSpacing: '0.01em', lineHeight: 1.2,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot, flexShrink: 0 }} />}
      {children}
    </span>
  )
}
