import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Store, Area } from '@/types'
import GRLogo from '@/components/ui/GRLogo'
import Pill from '@/components/ui/Pill'
import { IconArrow, IconClose } from '@/components/ui/Icons'

type StoreWithArea = Store & { area: Pick<Area, 'name'> | null }

function useStore(id: string) {
  return useQuery<StoreWithArea | null>({
    queryKey: ['public-store', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*, area:areas(name)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as StoreWithArea | null
    },
    staleTime: 60_000,
  })
}

// ── Photo gallery ────────────────────────────────────────────────
function PhotoGallery({ photos, videoUrl }: { photos: string[]; videoUrl?: string | null }) {
  const [idx,      setIdx]      = useState(0)
  const [showVideo, setShowVideo] = useState(false)

  const all = photos.length > 0 ? photos : []
  const current = all[idx]

  if (all.length === 0 && !videoUrl) {
    return (
      <div style={{ height: 380, background: 'linear-gradient(135deg, #0B1A3D 0%, #1a2f6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(246,241,228,0.4)' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏪</div>
          <div style={{ fontSize: 14 }}>No photos yet</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#000', position: 'relative' }}>
      {/* Main display */}
      {showVideo && videoUrl ? (
        <div style={{ position: 'relative', height: 420, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            src={videoUrl}
            controls
            autoPlay
            style={{ maxHeight: 420, maxWidth: '100%', display: 'block' }}
          />
        </div>
      ) : current ? (
        <div style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
          <img
            key={idx}
            src={current}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Gradient overlay at bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(6,9,20,0.6))' }} />

          {/* Nav arrows */}
          {all.length > 1 && (
            <>
              <button
                onClick={() => setIdx(i => (i - 1 + all.length) % all.length)}
                style={arrowBtn('left')}
              >
                ‹
              </button>
              <button
                onClick={() => setIdx(i => (i + 1) % all.length)}
                style={arrowBtn('right')}
              >
                ›
              </button>
            </>
          )}

          {/* Photo counter */}
          {all.length > 1 && (
            <div style={{ position: 'absolute', bottom: 14, right: 16, background: 'rgba(6,9,20,0.65)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'rgba(246,241,228,0.8)', fontWeight: 600 }}>
              {idx + 1} / {all.length}
            </div>
          )}
        </div>
      ) : null}

      {/* Bottom bar: thumbnails + video tab */}
      {(all.length > 1 || videoUrl) && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', background: '#111', overflowX: 'auto' }}>
          {all.map((url, i) => (
            <button
              key={url}
              onClick={() => { setIdx(i); setShowVideo(false) }}
              style={{
                flexShrink: 0, width: 60, height: 44, borderRadius: 6,
                border: `2px solid ${!showVideo && idx === i ? '#D11F2C' : 'transparent'}`,
                padding: 0, cursor: 'pointer', overflow: 'hidden', background: 'none',
              }}
            >
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
          {videoUrl && (
            <button
              onClick={() => setShowVideo(true)}
              style={{
                flexShrink: 0, width: 60, height: 44, borderRadius: 6,
                border: `2px solid ${showVideo ? '#D11F2C' : 'transparent'}`,
                background: '#222', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 18 }}>▶</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>VIDEO</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function arrowBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 14,
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(6,9,20,0.55)', backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', fontSize: 24, fontWeight: 300,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

// ── Enquiry form ─────────────────────────────────────────────────
interface EnquiryFormProps {
  store: StoreWithArea
  onSuccess: (hadEmail: boolean) => void
}

function EnquiryForm({ store, onSuccess }: EnquiryFormProps) {
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [message,   setMessage]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err,       setErr]       = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())  { setErr('Please enter your name.'); return }
    if (!phone.trim()) { setErr('Please enter your phone number so we can contact you.'); return }
    setErr(null)
    setSubmitting(true)

    const { error } = await supabase.from('store_enquiries').insert({
      store_id: store.id,
      name:     name.trim(),
      email:    email.trim() || null,
      phone:    phone.trim() || null,
      message:  message.trim() || null,
    })

    if (error) {
      setErr(error.message)
      setSubmitting(false)
      return
    }

    // Fire-and-forget email notification (non-blocking)
    supabase.functions.invoke('notify-enquiry', {
      body: {
        store: { code: store.code, name: store.name, address: store.address, rent_usd: store.rent_usd },
        enquiry: { name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, message: message.trim() || null },
      },
    }).catch(() => {})

    setSubmitting(false)
    onSuccess(!!email.trim())
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {err && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)', color: '#D11F2C', fontSize: 13 }}>
          {err}
        </div>
      )}

      <div>
        <label style={lbl}>Full name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inp} required />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>Email <span style={{ fontWeight: 400, color: '#9E9893' }}>(optional)</span></label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inp} />
        </div>
        <div>
          <label style={lbl}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+231 88 605 5575" style={inp} required />
        </div>
      </div>

      <div>
        <label style={lbl}>Message <span style={{ fontWeight: 400, color: '#9E9893' }}>(optional)</span></label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us more about your needs, preferred lease length, business type, etc."
          rows={4}
          style={{ ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical' }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          height: 48, borderRadius: 10, background: '#D11F2C', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1, transition: 'opacity 0.15s',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit enquiry'}
      </button>

      <p style={{ fontSize: 12, color: '#9E9893', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
        By submitting you agree to be contacted by George Rental regarding this property.
      </p>
    </form>
  )
}

// ── Success banner ───────────────────────────────────────────────
function SuccessBanner({ hadEmail, onClose }: { hadEmail: boolean; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      style={{
        background: 'linear-gradient(135deg, #1a5c3a 0%, #2FB875 100%)',
        borderRadius: 14, padding: '28px 24px', textAlign: 'center',
        position: 'relative',
      }}
    >
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18 }}>
        ×
      </button>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Enquiry submitted!</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
        {hadEmail
          ? "Your request has been submitted. We’ve sent a confirmation to your email. We will get back to you shortly."
          : 'Your request has been submitted. We will get back to you shortly.'}
      </div>
      <div style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
        Call us directly: <strong style={{ color: '#fff' }}>+231 88 605 5575 / +231 77 056 7682</strong>
      </div>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function StoreDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: store, isLoading } = useStore(id!)
  const [done, setDone]       = useState(false)
  const [hadEmail, setHadEmail] = useState(false)

  const photos = (store?.photos?.length ? store.photos : store?.photo_url ? [store.photo_url] : []) as string[]

  function handleSuccess(email: boolean) {
    setHadEmail(email)
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gr-paper)', fontFamily: 'var(--f-body)' }}>
      {/* Nav */}
      <header style={{
        background: 'var(--gr-midnight)', padding: '0 48px', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <GRLogo size={20} />
        </Link>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(246,241,228,0.65)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back to stores
          </button>
          <Link to="/sign-in" style={{
            height: 34, padding: '0 16px', background: 'var(--gr-crimson)', color: '#fff',
            borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
            textDecoration: 'none', gap: 6,
          }}>
            Tenant sign in <IconArrow size={13} stroke="#fff" />
          </Link>
        </nav>
      </header>

      {isLoading && (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--gr-stone-2)' }}>Loading store…</div>
      )}

      {!isLoading && !store && (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏪</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 6 }}>Store not found</div>
          <Link to="/stores" style={{ color: 'var(--gr-crimson)', fontSize: 14 }}>← Back to all stores</Link>
        </div>
      )}

      {!isLoading && store && (
        <>
          {/* Photo / Video gallery */}
          <PhotoGallery photos={photos} videoUrl={store.video_url} />

          {/* Content grid */}
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start' }}>

            {/* Left: store info + enquiry form */}
            <div>
              {/* Store header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--gr-stone-2)', background: 'var(--gr-paper)', border: '1px solid var(--gr-line)', borderRadius: 6, padding: '2px 8px' }}>
                    {store.code}
                  </span>
                  <Pill tone={store.status === 'vacant' ? 'mint' : 'navy'}>
                    {store.status === 'vacant' ? 'Available to rent' : 'Currently occupied'}
                  </Pill>
                </div>
                <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700, color: 'var(--gr-ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  {store.name}
                </h1>
                {store.address && (
                  <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', margin: 0 }}>📍 {store.address}</p>
                )}
                {store.area?.name && (
                  <p style={{ fontSize: 13, color: 'var(--gr-stone-2)', margin: '4px 0 0' }}>🗺️ {store.area.name}, Monrovia</p>
                )}
              </div>

              {/* Rent card */}
              <div style={{
                background: 'var(--gr-midnight)', borderRadius: 14, padding: '20px 24px', marginBottom: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.5)', marginBottom: 4 }}>Monthly rent</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 32, fontWeight: 700, color: 'var(--gr-cream)' }}>
                    ${store.rent_usd.toLocaleString()}
                    <span style={{ fontSize: 15, fontWeight: 400, color: 'rgba(246,241,228,0.5)', marginLeft: 4 }}>/month</span>
                  </div>
                </div>
                {store.status === 'vacant' && (
                  <div style={{ fontSize: 13, color: 'var(--gr-mint)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✓ Available now
                  </div>
                )}
              </div>

              {/* Enquiry section */}
              <div style={{ background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 16, padding: '28px 28px 28px' }}>
                <AnimatePresence mode="wait">
                  {done ? (
                    <SuccessBanner key="success" hadEmail={hadEmail} onClose={() => setDone(false)} />
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 4 }}>
                          Enquire about this store
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>
                          Fill in your details and we'll get back to you as soon as possible.
                        </div>
                      </div>
                      <EnquiryForm store={store} onSuccess={handleSuccess} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: contact card + details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Contact card */}
              <div style={{ background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 16, padding: '24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>
                  Contact us directly
                </div>

                <a href="tel:+231886055575" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 10, padding: 14, background: 'var(--gr-paper)', borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gr-midnight)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    📞
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginBottom: 1 }}>Call or WhatsApp</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>+231 88 605 5575</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-stone)' }}>+231 77 056 7682</div>
                  </div>
                </a>

                <a href="mailto:eg8217178@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 0, padding: 14, background: 'var(--gr-paper)', borderRadius: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--gr-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    ✉️
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginBottom: 1 }}>Email us</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>eg8217178@gmail.com</div>
                  </div>
                </a>
              </div>

              {/* Office hours */}
              <div style={{ background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Office hours
                </div>
                {[
                  ['Mon – Saturday', '8:00 AM – 6:00 PM'],
                  ['Sunday',         'Closed'],
                ].map(([day, hours]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--gr-stone)' }}>{day}</span>
                    <span style={{ fontWeight: 600, color: hours === 'Closed' ? 'var(--gr-stone-2)' : 'var(--gr-ink)' }}>{hours}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gr-paper)', borderRadius: 8, fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.5 }}>
                  📍 George Rental Office<br />Broad Street, Central Monrovia, Liberia
                </div>
              </div>

              {/* Browse more */}
              <Link to="/stores" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 46, borderRadius: 12, border: '1px solid var(--gr-line)',
                background: '#fff', fontSize: 14, fontWeight: 500, color: 'var(--gr-ink)',
                textDecoration: 'none',
              }}>
                Browse all stores <IconArrow size={14} stroke="currentColor" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--gr-ink)', marginBottom: 5,
}

const inp: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 12px',
  borderRadius: 9, border: '1px solid var(--gr-line)',
  background: 'var(--gr-paper)', fontSize: 14,
  color: 'var(--gr-ink)', outline: 'none',
  boxSizing: 'border-box',
}
