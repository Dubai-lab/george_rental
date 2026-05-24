import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import { IconMail, IconArrow } from '@/components/ui/Icons'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--gr-grad-hero)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Crimson bloom */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(209,31,44,0.30) 0%, transparent 60%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 440,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 40px 80px rgba(6,9,20,0.4)',
          overflow: 'hidden', position: 'relative', zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{ background: 'var(--gr-midnight)', padding: '28px 32px 24px' }}>
          <GRLogo size={22} />
          <p style={{ margin: '18px 0 0', fontSize: 14, color: 'rgba(246,241,228,0.65)', lineHeight: 1.6 }}>
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            /* ── Success state ── */
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ padding: '40px 32px', textAlign: 'center' }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 99,
                background: 'rgba(209,31,44,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <IconMail size={28} stroke="var(--gr-crimson)" />
              </div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>
                Check your inbox
              </div>
              <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.7, marginBottom: 28 }}>
                We sent a password reset link to <strong style={{ color: 'var(--gr-ink)' }}>{email}</strong>.
                Check your email and click the link — it expires in 1 hour.
              </p>
              <p style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginBottom: 24 }}>
                Didn't get it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gr-crimson)', fontWeight: 600, padding: 0, fontSize: 13 }}
                >
                  try again
                </button>.
              </p>
              <Link
                to="/sign-in"
                style={{ fontSize: 13, color: 'var(--gr-stone-2)', textDecoration: 'none', fontWeight: 500 }}
              >
                ← Back to sign in
              </Link>
            </motion.div>
          ) : (
            /* ── Form ── */
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}
            >
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>
                Reset your password
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)',
                    color: 'var(--gr-crimson)', fontSize: 13,
                  }}
                >
                  {error}
                </motion.div>
              )}

              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <Btn kind="crimson" type="submit" size="lg" loading={loading} style={{ width: '100%' }}>
                Send reset link
              </Btn>

              <div style={{ textAlign: 'center' }}>
                <Link to="/sign-in" style={{ fontSize: 13, color: 'var(--gr-stone-2)', textDecoration: 'none', fontWeight: 500 }}>
                  ← Back to sign in
                </Link>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: 'var(--gr-stone)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px',
  borderRadius: 10, border: '1px solid var(--gr-line)',
  background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none',
}
