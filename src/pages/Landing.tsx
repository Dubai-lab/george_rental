import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GRLogo from '@/components/ui/GRLogo'
import { IconArrow, IconLock } from '@/components/ui/Icons'
import { useWindowWidth } from '@/hooks/useWindowWidth'

const STATS = [
  { k: '50',      l: 'storefronts you can find' },
  { k: '2 min',   l: 'to pay & get a receipt'   },
  { k: '24/7',    l: 'access from any browser'  },
  { k: 'Android', l: 'app arriving soon'         },
]

export default function Landing() {
  const w = useWindowWidth()
  const isMobile = w < 640
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--gr-grad-hero)',
      color: 'var(--gr-cream)', fontFamily: 'var(--f-body)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Crimson bloom */}
      <div style={{
        position: 'absolute', top: -260, right: -180,
        width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(209,31,44,0.55) 0%, rgba(209,31,44,0) 60%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
      <div className="gr-noise" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* ── Nav ── */}
      <header style={{ position: 'relative', zIndex: 10 }}>
        <div style={{
          height: 68, padding: isMobile ? '0 20px' : '0 64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <GRLogo size={20} />

          {/* Desktop nav */}
          {!isMobile && (
            <nav style={{ display: 'flex', gap: 36, fontSize: 14, color: 'rgba(246,241,228,0.78)' }}>
              <Link to="/stores" style={navLink}>Stores</Link>
              <Link to="/sign-in" style={navLink}>Pay rent</Link>
              <a href="#help" style={navLink}>Help</a>
              <a href="#contact" style={navLink}>Contact</a>
            </nav>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!isMobile && (
              <Link to="/sign-in" style={{
                height: 38, padding: '0 16px', background: 'transparent',
                color: 'rgba(246,241,228,0.85)', border: '1px solid rgba(246,241,228,0.18)',
                borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center',
                textDecoration: 'none',
              }}>
                Owner sign in
              </Link>
            )}
            <Link to="/sign-in" style={{
              height: 38, padding: '0 18px', background: 'var(--gr-crimson)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center',
              boxShadow: '0 8px 24px rgba(209,31,44,0.35)',
              textDecoration: 'none',
            }}>
              Pay my rent →
            </Link>

            {/* Hamburger (mobile only) */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  background: 'rgba(246,241,228,0.08)', border: '1px solid rgba(246,241,228,0.15)',
                  borderRadius: 8, width: 38, height: 38, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
                <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {isMobile && menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'rgba(6,9,20,0.97)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(246,241,228,0.1)',
                padding: '8px 20px 20px',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              {[
                { label: 'Stores',        to: '/stores' },
                { label: 'Pay rent',      to: '/sign-in' },
                { label: 'Help',          href: '#help' },
                { label: 'Contact',       href: '#contact' },
                { label: 'Owner sign in', to: '/sign-in' },
              ].map(item => (
                item.href ? (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={mobileNavLink}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to!}
                    onClick={() => setMenuOpen(false)}
                    style={mobileNavLink}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <div style={{
        position: 'relative', zIndex: 4,
        padding: isMobile ? '28px 20px 0' : '40px 64px 0',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '600px 1fr',
        gap: isMobile ? 0 : 80,
        minHeight: isMobile ? 'auto' : 'calc(100vh - 190px)',
      }}>
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ paddingTop: isMobile ? 8 : 24, paddingBottom: isMobile ? 40 : 0 }}
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 12px 6px 6px',
            background: 'rgba(246,241,228,0.06)',
            border: '1px solid rgba(246,241,228,0.12)',
            borderRadius: 999, fontSize: 12, color: 'rgba(246,241,228,0.7)', marginBottom: 24,
          }}>
            <span style={{ padding: '3px 10px', background: 'var(--gr-crimson)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              FOR TENANTS
            </span>
            For shopkeepers renting from George Rental
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--f-display)',
            fontSize: isMobile ? 'clamp(44px, 12vw, 60px)' : 'clamp(56px, 6vw, 84px)',
            fontWeight: 700, lineHeight: 0.96, letterSpacing: '-0.035em',
            margin: 0, color: 'var(--gr-cream)',
          }}>
            Your rent.<br />
            Your receipts.<br />
            <span style={{ color: 'var(--gr-crimson)', fontStyle: 'italic', fontWeight: 600 }}>In one place.</span>
          </h1>

          <p style={{
            marginTop: 24, maxWidth: isMobile ? '100%' : 520, fontSize: isMobile ? 16 : 18, lineHeight: 1.55,
            color: 'rgba(246,241,228,0.72)', fontWeight: 400,
          }}>
            Pay your monthly rent through MTN MoMo or LBDI bank transfer, upload your proof, and
            keep every receipt on your phone. From any phone, any browser — no app to install.
          </p>

          <div style={{
            marginTop: 32, display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
          }}>
            <Link to="/sign-in" style={{
              height: 52, padding: '0 24px', background: 'var(--gr-crimson)', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 10px 30px rgba(209,31,44,0.35)',
              textDecoration: 'none',
            }}>
              Pay my rent <IconArrow size={16} stroke="#fff" />
            </Link>
            <Link to="/sign-in" style={{
              height: 52, padding: '0 22px', background: 'transparent', color: 'var(--gr-cream)',
              border: '1px solid rgba(246,241,228,0.22)', borderRadius: 10, fontSize: 15, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              textDecoration: 'none',
            }}>
              <IconLock size={15} stroke="var(--gr-cream)" />
              Owner / staff sign in
            </Link>
          </div>

          {/* Trust strip */}
          <div style={{
            marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(246,241,228,0.10)',
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: isMobile ? 14 : 36,
            fontSize: 12, color: 'rgba(246,241,228,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Payments via</span>
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: '#FFCC00' }}>MTN MoMo</span>
            <span style={{ width: 1, height: 18, background: 'rgba(246,241,228,0.18)', display: isMobile ? 'none' : 'block' }} />
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--gr-cream)' }}>LBDI · Ecobank · UBA</span>
          </div>
        </motion.div>

        {/* Right — floating card stack (desktop only) */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Glow */}
            <div style={{
              position: 'absolute', top: '20%', left: '30%', width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(31,58,122,0.55) 0%, rgba(31,58,122,0) 60%)',
              filter: 'blur(8px)', pointerEvents: 'none',
            }} />

            {/* Card stack */}
            <div style={{ position: 'relative', width: 460, height: 560 }}>
              {/* Back card - stores panel */}
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: 20, left: 0, width: 400, height: 260,
                  background: '#fff', borderRadius: 16,
                  boxShadow: '0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(11,26,61,0.12)',
                }}
              >
                <MiniStoresCard />
              </motion.div>

              {/* Middle card - dashboard */}
              <motion.div
                animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                style={{
                  position: 'absolute', top: 120, left: 60, width: 380, height: 240,
                  background: '#fff', borderRadius: 16,
                  boxShadow: '0 60px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(11,26,61,0.12)',
                }}
              >
                <MiniDashCard />
              </motion.div>

              {/* Front card - receipt */}
              <motion.div
                animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                style={{
                  position: 'absolute', top: 260, left: 20, width: 220, height: 290,
                  background: 'var(--gr-paper)', borderRadius: 14,
                  boxShadow: '0 80px 140px rgba(0,0,0,0.6), 0 0 0 1px rgba(11,26,61,0.15)',
                }}
              >
                <MiniReceiptCard />
              </motion.div>

              {/* MTN chip */}
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [8, 12, 8] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                style={{
                  position: 'absolute', top: 30, right: 0, width: 110, height: 110, borderRadius: 22,
                  background: 'linear-gradient(135deg, #FFCC00 0%, #F2A900 100%)',
                  boxShadow: '0 30px 60px rgba(255,180,0,0.35)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#0B1A3D',
                }}
              >
                <div style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.04em', lineHeight: 1 }}>MTN</div>
                <div style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: 12, marginTop: 4, letterSpacing: '0.02em' }}>MoMo</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom KPI strip ── */}
      <div style={{
        position: 'relative', zIndex: 4,
        borderTop: '1px solid rgba(246,241,228,0.10)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.25) 100%)',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
        alignItems: 'center',
        padding: isMobile ? '24px 20px' : '28px 64px',
        gap: isMobile ? '20px 0' : 0,
      }}>
        {STATS.map((x, i) => (
          <motion.div
            key={x.k}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
            style={{
              borderLeft: isMobile
                ? (i % 2 === 0 ? 'none' : '1px solid rgba(246,241,228,0.10)')
                : (i ? '1px solid rgba(246,241,228,0.10)' : 'none'),
              paddingLeft: (isMobile ? i % 2 !== 0 : i) ? 24 : 0,
            }}
          >
            <div style={{ fontFamily: 'var(--f-display)', fontSize: isMobile ? 32 : 40, fontWeight: 700, color: 'var(--gr-cream)', letterSpacing: '-0.03em', lineHeight: 1 }}>{x.k}</div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(246,241,228,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{x.l}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Help section ── */}
      <div id="help" style={{ background: '#fff', padding: isMobile ? '40px 20px' : '64px 64px', borderTop: '1px solid var(--gr-line)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: isMobile ? 22 : 28, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 8 }}>Help & FAQ</div>
          <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginBottom: 32 }}>Common questions about renting from George Rental.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { q: 'How do I pay my rent?', a: 'Sign in to your tenant account, go to "Pay Rent", choose MTN MoMo or bank transfer, enter the transaction reference, and upload your proof of payment. Your landlord will confirm within 24 hours.' },
              { q: 'How do I get my receipt?', a: 'Once the owner confirms your payment, a receipt is automatically generated. You can view and download all your receipts from the "Receipts" tab after signing in.' },
              { q: 'What if I don\'t have an account?', a: 'Tenant accounts are created by invitation only. Contact the George Rental office and they will send you an invite link by email to set up your account.' },
              { q: 'What payment methods are accepted?', a: 'MTN Mobile Money (primary), bank transfer via LBDI, Ecobank, or UBA, and cash payments accepted at the office.' },
              { q: 'How do I report a maintenance issue?', a: 'Sign in and go to the "Maintenance" tab. Submit a request with a description and priority level. The management team will follow up.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ padding: isMobile ? '16px 18px' : '20px 24px', borderRadius: 12, border: '1px solid var(--gr-line)', background: 'var(--gr-paper)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 8 }}>{q}</div>
                <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.6 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contact section ── */}
      <div id="contact" style={{ position: 'relative', zIndex: 1, background: 'var(--gr-midnight)', padding: isMobile ? '40px 20px' : '64px 64px', color: 'var(--gr-cream)' }}>
        <div style={{
          maxWidth: 760, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: isMobile ? 36 : 48,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: isMobile ? 22 : 28, fontWeight: 700, marginBottom: 8 }}>Contact Us</div>
            <div style={{ fontSize: 14, color: 'rgba(246,241,228,0.6)', marginBottom: 28, lineHeight: 1.6 }}>
              Have a question or need help with your account? Reach out to the George Rental team.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Office',  value: 'Broad Street, Central Monrovia, Liberia' },
                { label: 'Phone',   value: '+231 88 605 5575 / +231 77 056 7682' },
                { label: 'Email',   value: 'eg8217178@gmail.com' },
                { label: 'Hours',   value: 'Mon–Sat 8:00 AM – 6:00 PM' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 56, fontSize: 11, color: 'rgba(246,241,228,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2, flexShrink: 0 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'rgba(246,241,228,0.85)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Already have an account?</div>
            <Link to="/sign-in" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 48, borderRadius: 10, background: 'var(--gr-crimson)',
              color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              Sign in →
            </Link>
            <Link to="/stores" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--gr-cream)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            }}>
              Browse available stores
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          maxWidth: 760, margin: '40px auto 0', paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 12,
        }}>
          <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.35)' }}>© 2026 George Rental. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'rgba(246,241,228,0.35)', alignItems: 'center' }}>
            <Link to="/stores" style={{ color: 'rgba(246,241,228,0.35)', textDecoration: 'none' }}>Stores</Link>
            <a href="#help" style={{ color: 'rgba(246,241,228,0.35)', textDecoration: 'none' }}>Help</a>
            <Link to="/privacy" style={{ color: 'rgba(246,241,228,0.35)', textDecoration: 'none' }}>Privacy Policy</Link>
            <ComingSoonBadge label="Get Android App" icon="android" />
            <ComingSoonBadge label="Get iOS App" icon="apple" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ComingSoonBadge({ label, icon }: { label: string; icon: 'android' | 'apple' }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => { setShow(true); setTimeout(() => setShow(false), 2000) }}
        type="button"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'rgba(246,241,228,0.35)', fontSize: 12, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 5 }}
      >
        {icon === 'android' ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M17.523 15.341a.673.673 0 0 1-.675-.672.673.673 0 0 1 .675-.672.673.673 0 0 1 .674.672.673.673 0 0 1-.674.672m-11.046 0a.673.673 0 0 1-.675-.672.673.673 0 0 1 .675-.672.673.673 0 0 1 .674.672.673.673 0 0 1-.674.672m11.356-6.179l1.347-2.326a.268.268 0 0 0-.1-.366.27.27 0 0 0-.367.1l-1.364 2.36a8.442 8.442 0 0 0-3.475-.737 8.44 8.44 0 0 0-3.474.737L8.937 6.57a.27.27 0 0 0-.367-.1.268.268 0 0 0-.1.366l1.347 2.326C7.343 10.285 5.79 12.427 5.79 14.93h12.42c0-2.503-1.553-4.645-3.377-5.768"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
          </svg>
        )}
        {label}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
              background: '#1a2340', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, color: 'rgba(246,241,228,0.8)', whiteSpace: 'nowrap' }}
          >
            Coming soon
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const navLink: React.CSSProperties = {
  color: 'rgba(246,241,228,0.78)', textDecoration: 'none', fontSize: 14,
  transition: 'color 0.15s', cursor: 'pointer',
}

const mobileNavLink: React.CSSProperties = {
  display: 'block', padding: '14px 4px',
  color: 'rgba(246,241,228,0.85)', textDecoration: 'none', fontSize: 16, fontWeight: 500,
  borderBottom: '1px solid rgba(246,241,228,0.07)',
}

// ─── Mini card components ─────────────────────────────────────
function MiniStoresCard() {
  return (
    <div style={{ height: '100%', fontFamily: 'var(--f-body)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gr-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gr-ink)' }}>All stores · Monrovia</div>
        <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>50 properties</div>
      </div>
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} style={{ background: 'var(--gr-paper)', borderRadius: 7, padding: 8, fontSize: 9 }}>
            <div style={{ height: 36, borderRadius: 5, background: ['#D11F2C','#0B1A3D','#2FB875','#E9B949','#1F3A7A'][i%5], opacity: 0.8 }} />
            <div style={{ marginTop: 5, fontWeight: 600, color: 'var(--gr-ink)', fontSize: 10 }}>Broad #{12+i}</div>
            <div style={{ color: 'var(--gr-stone-2)', fontSize: 9 }}>${280+i*10}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniDashCard() {
  return (
    <div style={{ height: '100%', fontFamily: 'var(--f-body)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--gr-line)' }}>
        <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>This month</div>
        <div style={{ marginTop: 4, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 26, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>$14,260</div>
      </div>
      <div style={{ padding: '10px 18px', flex: 1 }}>
        <svg viewBox="0 0 340 100" width="100%" height={80} preserveAspectRatio="none">
          <defs>
            <linearGradient id="mc" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#D11F2C" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#D11F2C" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 80 L40 70 L80 74 L120 56 L160 62 L200 48 L240 44 L280 30 L340 14 L340 100 L0 100 Z" fill="url(#mc)" />
          <path d="M0 80 L40 70 L80 74 L120 56 L160 62 L200 48 L240 44 L280 30 L340 14" fill="none" stroke="#D11F2C" strokeWidth="2" />
          <circle cx="340" cy="14" r="4" fill="#D11F2C" />
        </svg>
      </div>
    </div>
  )
}

function MiniReceiptCard() {
  return (
    <div style={{ height: '100%', padding: 18, fontFamily: 'var(--f-body)', color: 'var(--gr-ink)' }}>
      <div style={{ fontSize: 8, letterSpacing: '0.14em', color: 'var(--gr-stone-2)', textTransform: 'uppercase' }}>Receipt · GR-00428</div>
      <div style={{ marginTop: 8, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 18, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        Rent paid<br /><span style={{ color: 'var(--gr-mint)' }}>in full ✓</span>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(11,26,61,0.18)', fontSize: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[['Tenant','Mariama Kollie'],['Store','Broad St #12'],['Period','May 2026'],['Method','MTN MoMo']].map(([l,v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ color: 'var(--gr-stone-2)' }}>{l}</span>
            <span style={{ fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(11,26,61,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 9, color: 'var(--gr-stone-2)' }}>Total</div>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>$280</div>
      </div>
    </div>
  )
}
