import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import { IconEye, IconEyeOff, IconLock } from '@/components/ui/Icons'

type FormValues = { email: string; password: string }

export default function SignIn() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw]   = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormValues>()

  // Navigate once we have both user AND profile (profile fetch is async after sign-in)
  useEffect(() => {
    if (!loading && user && profile) {
      navigate(profile.role === 'owner' ? '/owner/dashboard' : '/tenant', { replace: true })
    }
  }, [user, profile, loading])

  async function onSubmit({ email, password }: FormValues) {
    setAuthErr(null)
    try {
      await signIn(email, password)
      // onAuthStateChange will set profile → the effect above will navigate
    } catch (e: any) {
      setAuthErr(e.message ?? 'Sign in failed. Check your email and password.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--gr-grad-hero)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Bloom */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(209,31,44,0.35) 0%, transparent 60%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35 }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          width: '100%', maxWidth: 440,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 40px 80px rgba(6,9,20,0.4)',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Top stripe */}
        <div style={{ background: 'var(--gr-midnight)', padding: '28px 32px 24px' }}>
          <GRLogo size={22} />
          <div style={{ marginTop: 18, fontSize: 14, color: 'rgba(246,241,228,0.65)', lineHeight: 1.5 }}>
            Sign in to manage your properties, record payments, and track your rental income.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {authErr && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)',
                color: 'var(--gr-crimson)', fontSize: 13, lineHeight: 1.5,
              }}
            >
              {authErr}
            </motion.div>
          )}

          <div>
            <label style={labelStyle}>Email address</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="owner@georgerental.com"
              {...register('email', { required: 'Email is required' })}
              style={{ ...inputStyle, borderColor: errors.email ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
            />
            {errors.email && <div style={errStyle}>{errors.email.message}</div>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--gr-crimson)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                style={{ ...inputStyle, paddingRight: 48, borderColor: errors.password ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--gr-stone-2)', padding: 0,
                }}
              >
                {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
            {errors.password && <div style={errStyle}>{errors.password.message}</div>}
          </div>

          <Btn
            kind="crimson" type="submit" size="lg" loading={isSubmitting}
            style={{ width: '100%', marginTop: 4 }}
            icon={<IconLock size={16} stroke="#fff" />}
          >
            Sign in
          </Btn>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gr-stone-2)' }}>
            <Link to="/" style={{ color: 'var(--gr-stone-2)', fontWeight: 500, textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </div>
        </form>
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
  transition: 'border-color 0.15s',
}
const errStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--gr-crimson)', marginTop: 4,
}
