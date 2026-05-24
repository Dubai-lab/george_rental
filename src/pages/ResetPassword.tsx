import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import { IconEye, IconEyeOff, IconCheck, IconLock } from '@/components/ui/Icons'

type Step = 'waiting' | 'form' | 'done' | 'expired'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [step,    setStep]    = useState<Step>('waiting')
  const [showPw,  setShowPw]  = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStep('form')
    })

    // Also check immediately in case the event already fired before this mounted
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep('form')
    })

    // If nothing fires within 6 seconds, the link is expired or invalid
    const timer = setTimeout(() => {
      setStep(prev => prev === 'waiting' ? 'expired' : prev)
    }, 6000)

    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('done')
    setTimeout(() => navigate('/sign-in', { replace: true }), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--gr-grad-hero)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
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
            {step === 'waiting'
              ? 'Verifying your reset link…'
              : step === 'expired'
              ? 'This link has expired or is invalid.'
              : step === 'done'
              ? 'Your password has been updated.'
              : 'Choose a new password for your account.'}
          </p>
        </div>

        {/* ── Waiting ── */}
        {step === 'waiting' && (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 99,
              border: '3px solid var(--gr-line)',
              borderTopColor: 'var(--gr-crimson)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', margin: 0 }}>
              Verifying your link…
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Expired / Invalid ── */}
        {step === 'expired' && (
          <div style={{ padding: '36px 32px 40px', textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 99,
              background: 'rgba(209,31,44,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: 26,
            }}>
              🔗
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>
              Link expired
            </div>
            <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.7, marginBottom: 28 }}>
              This password reset link has expired or already been used.
              Reset links are valid for <strong>1 hour</strong> and can only be used once.
            </p>
            <Btn kind="crimson" style={{ width: '100%', marginBottom: 14 }} onClick={() => navigate('/forgot-password')}>
              Request a new link
            </Btn>
            <div style={{ textAlign: 'center' }}>
              <a href="/sign-in" style={{ fontSize: 13, color: 'var(--gr-stone-2)', textDecoration: 'none', fontWeight: 500 }}>
                ← Back to sign in
              </a>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>
              Create new password
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
              <label style={labelStyle}>New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 48 }}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw(v => !v)}
                  style={eyeBtn}
                >
                  {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: strengthScore(password) >= n
                        ? strengthColor(strengthScore(password))
                        : 'var(--gr-line)',
                      transition: 'background 0.2s',
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: strengthColor(strengthScore(password)), marginLeft: 6, fontWeight: 600 }}>
                    {strengthLabel(strengthScore(password))}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Confirm new password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Same password again"
                autoComplete="new-password"
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? 'var(--gr-crimson)' : 'var(--gr-line)',
                }}
              />
              {confirm && confirm !== password && (
                <div style={{ fontSize: 12, color: 'var(--gr-crimson)', marginTop: 4 }}>
                  Passwords do not match
                </div>
              )}
            </div>

            <Btn
              kind="crimson" type="submit" size="lg" loading={loading}
              style={{ width: '100%', marginTop: 4 }}
              icon={<IconLock size={16} stroke="#fff" />}
            >
              Update password
            </Btn>
          </form>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                width: 68, height: 68, borderRadius: 99,
                background: 'rgba(47,184,117,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <IconCheck size={32} stroke="#2FB875" />
            </motion.div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>
              Password updated!
            </div>
            <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.7 }}>
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function strengthScore(pw: string): number {
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.max(1, s)
}
function strengthColor(s: number) {
  return s <= 1 ? '#D11F2C' : s === 2 ? '#E9B949' : s === 3 ? '#2FB875' : '#16A34A'
}
function strengthLabel(s: number) {
  return s <= 1 ? 'Weak' : s === 2 ? 'Fair' : s === 3 ? 'Good' : 'Strong'
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
const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--gr-stone-2)', padding: 0,
}
