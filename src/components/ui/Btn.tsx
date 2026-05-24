import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type Kind = 'primary' | 'crimson' | 'cream' | 'ghost' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const kinds: Record<Kind, { bg: string; fg: string; bd: string }> = {
  primary: { bg: '#0B1A3D',               fg: '#F6F1E4', bd: 'transparent' },
  crimson: { bg: '#D11F2C',               fg: '#fff',    bd: 'transparent' },
  cream:   { bg: '#F6F1E4',               fg: '#0B1A3D', bd: 'rgba(11,26,61,0.18)' },
  ghost:   { bg: 'transparent',           fg: '#0B1A3D', bd: 'rgba(11,26,61,0.18)' },
  quiet:   { bg: 'transparent',           fg: '#4A4639', bd: 'transparent' },
}

const sizes: Record<Size, { h: number; px: number; fs: number; gap: number }> = {
  sm: { h: 32, px: 12, fs: 13, gap: 6  },
  md: { h: 40, px: 16, fs: 14, gap: 8  },
  lg: { h: 48, px: 22, fs: 15, gap: 10 },
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?:      Kind
  size?:      Size
  icon?:      ReactNode
  iconRight?: ReactNode
  style?:     CSSProperties
  loading?:   boolean
}

export default function Btn({
  children, kind = 'primary', size = 'md',
  icon, iconRight, style, loading, disabled, ...rest
}: BtnProps) {
  const k = kinds[kind]
  const s = sizes[size]
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        height: s.h, padding: `0 ${s.px}px`, gap: s.gap,
        background: k.bg, color: k.fg,
        border: `1px solid ${k.bd}`,
        borderRadius: 10, fontSize: s.fs, fontWeight: 500,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        whiteSpace: 'nowrap', letterSpacing: '-0.005em',
        opacity: (disabled || loading) ? 0.6 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading ? <Spinner size={s.fs} color={k.fg} /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}

function Spinner({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" style={{ animation: 'spin 0.8s linear infinite', transformOrigin: '12px 12px' }} />
    </svg>
  )
}
