import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { IconLock } from '@/components/ui/Icons'

// Two-step sign-in with an authenticator app (Google Authenticator, Authy, …).
//  • No authenticator yet  → set one up (scan QR, confirm with a code)
//  • Authenticator set up  → enter the current 6-digit code to finish signing in
export default function TwoStep() {
  const { user, profile, mfa, loading, signOut } = useAuth()

  const [qr,       setQr]       = useState<string | null>(null)
  const [secret,   setSecret]   = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code,     setCode]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const started = useRef(false)

  const setupMode = !!mfa && !mfa.enrolled

  // Setup mode: start an enrolment once and show its QR code
  useEffect(() => {
    if (!user || !setupMode || started.current) return
    started.current = true
    ;(async () => {
      try {
        // Clear half-finished attempts so a fresh QR can always be issued
        const { data: existing } = await supabase.auth.mfa.listFactors()
        for (const f of existing?.all ?? []) {
          if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
        const { data, error: err } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
        })
        if (err) throw err
        setFactorId(data.id)
        setQr(data.totp.qr_code)
        setSecret(data.totp.secret)
      } catch (e: any) {
        setError(e?.message ?? 'Could not start two-step setup. Refresh the page to try again.')
      }
    })()
  }, [user, setupMode])

  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/sign-in" replace />
  if (!mfa || !profile) return <LoadingScreen />
  // Already fully signed in → nothing to do here
  if (mfa.enrolled && mfa.verified) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.replace(/\D/g, '')
    if (clean.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true)
    setError(null)
    try {
      let id = factorId
      if (!setupMode) {
        const { data, error: err } = await supabase.auth.mfa.listFactors()
        if (err) throw err
        id = data.totp.find(f => f.status === 'verified')?.id ?? null
      }
      if (!id) throw new Error('No authenticator found for this account.')
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: clean })
      if (err) throw err
      // Full reload so every page starts from the upgraded session
      window.location.assign('/')
    } catch (e: any) {
      setBusy(false)
      setCode('')
      setError(/invalid|expired/i.test(e?.message ?? '')
        ? 'That code is not correct or has expired. Wait for a new code and try again.'
        : (e?.message ?? 'Could not verify the code.'))
    }
  }

  async function cancel() {
    // Leaving setup half-way: tenants just go back; owners must sign out
    if (setupMode && factorId) await supabase.auth.mfa.unenroll({ factorId }).catch(() => {})
    if (setupMode && profile?.role === 'tenant') { window.location.assign('/tenant/profile'); return }
    await signOut()
    window.location.assign('/')
  }

  const isOwner = profile.role === 'owner'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--gr-grad-hero)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 460, background: '#fff', borderRadius: 20,
          boxShadow: '0 40px 80px rgba(6,9,20,0.4)', overflow: 'hidden', position: 'relative',
        }}
      >
        <div style={{ background: 'var(--gr-midnight)', padding: '28px 32px 24px' }}>
          <GRLogo size={22} />
          <div style={{ marginTop: 18, fontSize: 14, color: 'rgba(246,241,228,0.75)', lineHeight: 1.5 }}>
            {setupMode
              ? (isOwner
                  ? 'The owner account must be protected with two-step sign-in. Set it up once — it takes a minute.'
                  : 'Add a second step to your sign-in so a stolen password is not enough to get into your account.')
              : 'Enter the code from your authenticator app to finish signing in.'}
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '26px 32px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>
            {setupMode ? 'Set up two-step sign-in' : 'Two-step sign-in'}
          </h1>

          {error && (
            <div role="alert" style={{
              padding: '10px 14px', borderRadius: 10, background: 'rgba(209,31,44,0.06)',
              border: '1px solid rgba(209,31,44,0.2)', color: 'var(--gr-crimson)', fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {setupMode && (
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--gr-stone)', lineHeight: 1.7 }}>
              <li>Install <strong>Google Authenticator</strong> (or Microsoft Authenticator / Authy) on your phone.</li>
              <li>In the app, tap <strong>+</strong> and scan this QR code.</li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
          )}

          {setupMode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 196, height: 196, borderRadius: 12, border: '1px solid var(--gr-line)',
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8,
              }}>
                {qr
                  ? <img src={qr} alt="QR code to scan with your authenticator app" style={{ width: '100%', height: '100%' }} />
                  : <span style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>Preparing…</span>}
              </div>
              {secret && (
                <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', textAlign: 'center', lineHeight: 1.6 }}>
                  Can't scan? Enter this key in the app instead:<br />
                  <code style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)', wordBreak: 'break-all', userSelect: 'all' }}>
                    {secret}
                  </code>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="totp-code" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gr-stone)', marginBottom: 6 }}>
              6-digit code
            </label>
            <input
              id="totp-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="000000"
              style={{
                width: '100%', height: 52, padding: '0 14px', borderRadius: 10,
                border: '1px solid var(--gr-line)', background: '#fff', outline: 'none',
                fontFamily: 'var(--f-mono)', fontSize: 24, fontWeight: 600, letterSpacing: '0.35em',
                textAlign: 'center', color: 'var(--gr-ink)',
              }}
            />
          </div>

          <Btn
            kind="crimson" type="submit" size="lg" loading={busy}
            disabled={setupMode && !factorId}
            style={{ width: '100%' }}
            icon={<IconLock size={16} stroke="#fff" />}
          >
            {setupMode ? 'Turn on two-step sign-in' : 'Verify and continue'}
          </Btn>

          {!setupMode && (
            <p style={{ fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.6, textAlign: 'center' }}>
              Lost the phone with your authenticator app?{' '}
              {isOwner
                ? 'Remove the authenticator for this account in your Supabase dashboard (Authentication → Users), then sign in and set it up again.'
                : 'Contact the George Rental office on +231 88 605 5575. After checking it is you, they can reset it.'}
            </p>
          )}

          <button
            type="button" onClick={cancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--gr-stone-2)', fontWeight: 500 }}
          >
            {setupMode && !isOwner ? '← Not now' : '← Sign out'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
