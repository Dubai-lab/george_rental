import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'

interface AuthContextType {
  user:    User | null
  profile: Profile | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<'owner' | 'tenant'>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(null!)

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // ── Initial session check ──────────────────────────────────────
    // getSession() reads from localStorage (fast). If the token is
    // expired it will attempt a network refresh — we race it against
    // a 7-second timeout so the spinner ALWAYS clears.
    async function init() {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>(res => setTimeout(() => res(null), 7000)),
        ])

        if (!mounted) return
        const session = sessionResult?.data?.session ?? null
        setUser(session?.user ?? null)

        if (session?.user) {
          // Profile fetch also gets a timeout so it never blocks forever
          const p = await Promise.race([
            fetchProfile(session.user.id),
            new Promise<null>(res => setTimeout(() => res(null), 5000)),
          ])
          if (!mounted) return
          setProfile(p)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // ── Subsequent auth events (sign-in, sign-out, token refresh) ──
    // We skip INITIAL_SESSION because init() above already handled it.
    // Skipping it prevents a double profile-fetch race on startup.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          const p = await fetchProfile(session.user.id)
          if (!mounted) return
          // Only overwrite profile if fetch succeeded — don't null-out a
          // valid session just because a background refresh fetch failed.
          if (p !== null) setProfile(p)
        } else {
          // Genuine sign-out — clear everything
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<'owner' | 'tenant'> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    // Fetch profile immediately — don't wait for onAuthStateChange chain
    const p = await fetchProfile(data.user.id)
    if (!p) throw new Error('Account not set up yet. Contact the property manager.')
    setUser(data.user)
    setProfile(p)
    return p.role
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
