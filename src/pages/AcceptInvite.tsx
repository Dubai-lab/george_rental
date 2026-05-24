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
  const navigate  = useNavigate()
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)

  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<FormValues>()
  const pw = watch('password', '')

  async function onSubmit({ password }: FormValues) {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); return }
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
