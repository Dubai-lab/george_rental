import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Pill from '@/components/ui/Pill'

// Account-security card: shows whether two-step sign-in is on, and lets the
// user turn it on/off and sign out of every device.
export default function TwoStepCard({ required = false }: { required?: boolean }) {
  const { mfa } = useAuth()
  const [busy, setBusy] = useState<'off' | 'everywhere' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  const on = !!mfa?.enrolled

  async function turnOff() {
    if (!window.confirm('Turn off two-step sign-in? Your account will be protected by your password only.')) return
    setBusy('off'); setErr(null)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      for (const f of data.all) {
        const { error: e } = await supabase.auth.mfa.unenroll({ factorId: f.id })
        if (e) throw e
      }
      await supabase.auth.refreshSession()
      window.location.reload()
    } catch (e: any) {
      setErr(e?.message ?? 'Could not turn it off.')
      setBusy(null)
    }
  }

  async function signOutEverywhere() {
    if (!window.confirm('Sign out of George Rental on every phone and computer, including this one?')) return
    setBusy('everywhere'); setErr(null)
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) { setErr(error.message); setBusy(null); return }
    window.location.assign('/')
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--gr-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>Two-step sign-in</div>
          <Pill tone={on ? 'mint' : 'gray'}>{on ? 'On' : 'Off'}</Pill>
        </div>
        <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 6, lineHeight: 1.6 }}>
          {on
            ? 'Signing in needs your password and a code from your authenticator app.'
            : 'Add a code from an authenticator app (Google Authenticator) to your sign-in, so a stolen password is not enough.'}
          {required && ' Required for the owner account.'}
        </div>
        {err && <div role="alert" style={{ fontSize: 12, color: 'var(--gr-crimson)', marginTop: 8 }}>{err}</div>}
        <div style={{ marginTop: 12 }}>
          {!on ? (
            <a href="/two-step" style={primaryBtn}>Turn on two-step sign-in</a>
          ) : !required ? (
            <button type="button" onClick={turnOff} disabled={busy !== null} style={ghostBtn}>
              {busy === 'off' ? 'Turning off…' : 'Turn off'}
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.5 }}>
          Lost a phone or used a shared computer?
        </div>
        <button type="button" onClick={signOutEverywhere} disabled={busy !== null} style={ghostBtn}>
          {busy === 'everywhere' ? 'Signing out…' : 'Sign out of all devices'}
        </button>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', borderRadius: 9,
  background: 'var(--gr-crimson)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
}
const ghostBtn: React.CSSProperties = {
  height: 36, padding: '0 14px', borderRadius: 9, background: '#fff', flexShrink: 0,
  border: '1px solid rgba(11,26,61,0.18)', color: 'var(--gr-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
