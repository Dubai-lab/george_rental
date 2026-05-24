import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import { IconEye, IconEyeOff, IconCheck } from '@/components/ui/Icons'

type FormValues = { password: string; confirm: string }

export default function AcceptInvite() {
  const navigate = useNavigate()
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showPw, setShowPw]           = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkError, setLinkError]     = useState(false)

  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<FormValues>()
  const pw = watch('password', '')

  useEffect(() => {
    // Check if there's already a valid session (e.g. page reload after hash was consumed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setSessionReady(true); return }
    })

    // Supabase processes the invite hash and fires SIGNED_IN automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSessionReady(true)
      }
    })

    // If no session after 10s, the link is expired/invalid
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setLinkError(true)
        return prev
      })
    }, 10000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function onSubmit({ password }: FormValues) {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }

    // Create the lease from invite metadata now that account is activated
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata
      if (user && meta?.store_id) {
        const leaseCode = `LS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
        await supabase.from('leases').insert({
          tenant_id:        user.id,
          store_id:         meta.store_id,
          start_date:       meta.start_date ?? new Date().toISOString().slice(0, 10),
          monthly_rent_usd: meta.rent_usd ?? 0,
          business_name:    meta.business_name ?? null,
          business_type:    meta.business_type ?? null,
          status:           'active',
          lease_code:       leaseCode,
        })
        await supabase.from('stores').update({ status: 'occupied' }).eq('id', meta.store_id)
      }
    } catch {
      // Lease creation failure doesn't block account activation
    }

    setDone(true)
    setTimeout(() => navigate('/tenant', { replace: true }), 2000)
  }

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
        transition={{ duration: 0.4 }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440, background: '#fff',
          borderRadius: 20, boxShadow: '0 40px 80px rgba(6,9,20,0.4)',
          overflow: 'hidden',
        }}
      >
        <div style={{ background: 'var(--gr-midnight)', padding: '28px 32px 24px' }}>
          <GRLogo size={22} />
          <div style={{ marginTop: 16, fontSize: 14, color: 'rgba(246,241,228,0.65)', lineHeight: 1.5 }}>
            Welcome to George Rental. Set your password to activate your tenant account.
          </div>
        </div>

        {done ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: 'rgba(47,184,117,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <IconCheck size={32} stroke="#2FB875" />
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>Account activated!</div>
            <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 8 }}>Redirecting to your home screen…</div>
          </div>

        ) : linkError ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 8 }}>Invite link expired</div>
            <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.6, marginBottom: 24 }}>
              This link has expired or already been used. Ask the property manager to resend the invite.
            </div>
            <a href="/sign-in" style={{ fontSize: 13, color: 'var(--gr-crimson)', fontWeight: 500 }}>← Back to sign in</a>
          </div>

        ) : !sessionReady ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid rgba(209,31,44,0.15)',
              borderTopColor: 'var(--gr-crimson)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <div style={{ fontSize: 14, color: 'var(--gr-stone-2)' }}>Verifying your invite link…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>

        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)', color: 'var(--gr-crimson)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>Create password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  {...register('password', { required: true, minLength: { value: 8, message: 'Min 8 characters' } })}
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={eyeBtn}>
                  {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {errors.password && <div style={errStyle}>{errors.password.message}</div>}
            </div>

            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Same password again"
                {...register('confirm', {
                  required: true,
                  validate: v => v === pw || 'Passwords do not match',
                })}
                style={inputStyle}
              />
              {errors.confirm && <div style={errStyle}>{errors.confirm.message}</div>}
            </div>

            <Btn kind="crimson" type="submit" size="lg" loading={isSubmitting} style={{ width: '100%', marginTop: 4 }}>
              Activate account
            </Btn>
          </form>
        )}
      </motion.div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gr-stone)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', height: 46, padding: '0 46px 0 14px', borderRadius: 10, border: '1px solid var(--gr-line)', background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none' }
const errStyle: React.CSSProperties   = { fontSize: 12, color: 'var(--gr-crimson)', marginTop: 4 }
const eyeBtn: React.CSSProperties     = { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gr-stone-2)', padding: 0 }
