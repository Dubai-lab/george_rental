import { CSSProperties } from 'react'
import { useSignedUrl } from '@/lib/privateFile'

interface PrivateImageProps {
  url:    string
  alt:    string
  style?: CSSProperties
}

// An image from a private bucket; click opens the full-size file in a new tab.
export default function PrivateImage({ url, alt, style }: PrivateImageProps) {
  const { data: src, isError } = useSignedUrl(url)
  if (isError) return <div style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>Could not load this file.</div>
  if (!src)    return <div style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>Loading…</div>
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
      <img src={src} alt={alt} style={{ cursor: 'zoom-in', ...style }} />
    </a>
  )
}
