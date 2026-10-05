import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

// Two-step sign-in state, read straight from the session (no network call):
//   enrolled — the account has an authenticator app set up
//   verified — this session has passed the code step (token is 'aal2')
export interface MfaState { enrolled: boolean; verified: boolean }

function decodeBase64Url(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  let out = '', bits = 0, acc = 0
  for (const c of s) {
    const v = chars.indexOf(c)
    if (v < 0) continue
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) { bits -= 8; out += String.fromCharCode((acc >> bits) & 0xff) }
  }
  return out
}

function mfaFromSession(session: Session | null): MfaState | null {
  if (!session) return null
  let aal = ''
  try { aal = JSON.parse(decodeBase64Url(session.access_token.split('.')[1])).aal ?? '' } catch { /* not verified */ }
  const enrolled = (session.user.factors ?? []).some(f => f.status === 'verified')
  return { enrolled, verified: aal === 'aal2' }
}

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mfa,     setMfa]     = useState<MfaState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // signIn() handles SIGNED_IN directly — skip here to avoid a duplicate
        // profile fetch racing with the one already running inside signIn()
        if (event === 'SIGNED_IN') return

        setMfa(mfaFromSession(session))

        if (session?.user) {
          const p = await Promise.race([
            fetchProfile(session.user.id),
            new Promise<null>(res => setTimeout(() => res(null), 8000)),
          ])
          if (!mounted) return
          if (p !== null) setProfile(p)
        } else {
          setProfile(null)
        }

        // INITIAL_SESSION fires on every app start — it tells us whether a
        // persisted session was found or not. Clear the splash loader here.
        if (event === 'INITIAL_SESSION' && mounted) {
          setLoading(false)
        }
      }
    )

    // Safety net: if INITIAL_SESSION never fires (network completely offline),
    // clear the loading screen after 12 s so the app isn't stuck forever.
    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 12000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [])

  async function signIn(email: string, password: string): Promise<void> {
    // Clear any stale session first. Without this a leftover expired or
    // conflicting session causes the next signInWithPassword call to hang
    // indefinitely on React Native — the exact bug seen on second login.
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const p = await Promise.race([
      fetchProfile(data.user.id),
      new Promise<null>(res => setTimeout(() => res(null), 8000)),
    ])

    if (!p) {
      await supabase.auth.signOut()
      throw new Error('Could not load your account. Please try again.')
    }

    // This app is the tenant portal. The owner manages everything on the website.
    if (p.role === 'owner') {
      await supabase.auth.signOut()
      throw new Error('The owner account is managed on the website: george-rental.vercel.app')
    }

    setMfa(mfaFromSession(data.session))
    setProfile(p)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setMfa(null)
  }

  return { profile, mfa, loading, signIn, signOut }
}
