import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import GRLogo from '@/components/ui/GRLogo'
import Btn from '@/components/ui/Btn'
import { IconEye, IconEyeOff, IconMail, IconUserPlus } from '@/components/ui/Icons'

type FormValues = { full_name: string; email: string; phone: string; password: string }

export default function SignUp() {
  const navigate = useNavigate()
  const [showPw, setShowPw]   = useState(false)
  const [authErr, setAuthErr] = useState<string | null>(null)
  const [sentTo, setSentTo]   = useState<string | null>(null)

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setAuthErr(null)
    const email = values.email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: values.full_name.trim(), phone: values.phone.trim() },
      },
    })
    if (error) { setAuthErr(error.message); return }

    // Supabase hides "already registered" behind a fake user with no identities
    if (data.user && data.user.identities?.length === 0) {
      setAuthErr('An account with this email already exists. Sign in instead, or reset your password.')
      return
    }

    // Email confirmation off → already signed in. Full reload so the session
    // is picked up cleanly by the auth provider.
    if (data.session) { window.location.assign('/'); return }

    setSentTo(email)
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
      <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} />

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
            Create a free account to request a store and track your requests in one place.
          </div>
        </div>

        {sentTo ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 99, background: 'rgba(47,184,117,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <IconMail size={28} stroke="#2FB875" />
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>
              Check your email
            </div>
            <p style={{ fontSize: 14, color: 'var(--gr-stone-2)', lineHeight: 1.7, marginBottom: 24 }}>
              We sent a confirmation link to <strong style={{ color: 'var(--gr-ink)' }}>{sentTo}</strong>.
              Open it to activate your account. If you don't see it, check your spam folder.
            </p>
            <Btn kind="primary" style={{ width: '100%' }} onClick={() => navigate('/sign-in')}>
              Go to sign in
            </Btn>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <label style={labelStyle}>Full name</label>
              <input
                autoComplete="name"
                placeholder="Mariama Kollie"
                {...register('full_name', { required: 'Your name is required' })}
                style={{ ...inputStyle, borderColor: errors.full_name ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
              />
              {errors.full_name && <div style={errStyle}>{errors.full_name.message}</div>}
            </div>

            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
                style={{ ...inputStyle, borderColor: errors.email ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
              />
              {errors.email && <div style={errStyle}>{errors.email.message}</div>}
            </div>

            <div>
              <label style={labelStyle}>Phone number</label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+231 88 000 0000"
                {...register('phone', { required: 'Phone is required so we can reach you' })}
                style={{ ...inputStyle, borderColor: errors.phone ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
              />
              {errors.phone && <div style={errStyle}>{errors.phone.message}</div>}
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                  })}
                  style={{ ...inputStyle, paddingRight: 48, borderColor: errors.password ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
                />
                <button
                  type="button"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
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
              icon={<IconUserPlus size={16} stroke="#fff" />}
            >
              Create account
            </Btn>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--gr-stone-2)' }}>
              Already have an account?{' '}
              <Link to="/sign-in" style={{ color: 'var(--gr-crimson)', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.6 }}>
              By creating an account you agree to our{' '}
              <Link to="/privacy" style={{ color: 'var(--gr-stone-2)', textDecoration: 'underline' }}>Privacy Policy &amp; Terms</Link>.
              <br />
              <Link to="/" style={{ color: 'var(--gr-stone-2)', fontWeight: 500, textDecoration: 'none' }}>← Back to home</Link>
            </div>
          </form>
        )}
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
