interface MoneyProps {
  usd:      number
  lrd?:     number
  fxRate?:  number
  primary?: 'usd' | 'lrd'
  size?:    number
  color?:   string
  dim?:     string
}

export default function Money({
  usd, lrd, fxRate = 180, primary = 'usd',
  size = 18, color = 'var(--gr-ink)', dim = 'var(--gr-stone-2)',
}: MoneyProps) {
  const lrdVal = lrd ?? Math.round(usd * fxRate)
  const bigText   = primary === 'usd' ? `$${usd.toLocaleString()}` : `L$${lrdVal.toLocaleString()}`
  const smallText = primary === 'usd' ? `L$${lrdVal.toLocaleString()}` : `$${usd.toLocaleString()}`

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 8,
      fontVariantNumeric: 'tabular-nums', color,
    }}>
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: '-0.01em' }}>{bigText}</span>
      <span style={{ fontSize: Math.round(size * 0.66), color: dim, fontWeight: 500 }}>{smallText}</span>
    </span>
  )
}
