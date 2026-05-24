interface GRLogoProps {
  size?: number
  color?: string
  accent?: string
  darkBg?: boolean
}

export default function GRLogo({
  size   = 22,
  color  = '#F6F1E4',
  accent = '#D11F2C',
  darkBg = true,
}: GRLogoProps) {
  const textColor = darkBg ? color : '#0B1A3D'
  const accentColor = accent

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--f-display)', color: textColor,
      fontWeight: 700, letterSpacing: '-0.02em',
    }}>
      <svg width={size * 1.4} height={size} viewBox="0 0 32 22" fill="none">
        <rect x="0"  y="6"  width="9"  height="16" rx="1" fill={textColor}  opacity="0.55" />
        <rect x="11" y="2"  width="9"  height="20" rx="1" fill={textColor} />
        <rect x="22" y="8"  width="9"  height="14" rx="1" fill={accentColor} />
        <rect x="2.5"  y="9"  width="4" height="3" fill={accentColor} opacity="0.35" />
        <rect x="13.5" y="5"  width="4" height="3" fill={accentColor} opacity="0.6" />
        <rect x="24.5" y="11" width="4" height="3" fill={textColor}   opacity="0.8" />
      </svg>
      <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>
        George<span style={{ color: accentColor, marginLeft: 4 }}>Rental</span>
      </span>
    </span>
  )
}
