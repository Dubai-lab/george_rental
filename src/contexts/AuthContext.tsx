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

    // onAuthStateChange is the single source of truth for session state.
    // INITIAL_SESSION fires on every page load — it restores the session from
    // localStorage (or confirms there is none). This is the correct Supabase v2
    // pattern and replaces the old getSession() + timeout approach that was
    // causing users to be logged out on refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // SIGNED_IN is handled directly inside signIn() — skip it here to
        // avoid a duplicate profile fetch racing with the one in signIn().
        if (event === 'SIGNED_IN') return

        if (session?.user) {
          setUser(session.user)
          const p = await Promise.race([
            fetchProfile(session.user.id),
            new Promise<null>(res => setTimeout(() => res(null), 8000)),
          ])
          if (!mounted) return
          if (p !== null) setProfile(p)
        } else {
          setUser(null)
          setProfile(null)
        }

        // Clear the initial loading spinner once the persisted session is known
        if (event === 'INITIAL_SESSION' && mounted) {
          setLoading(false)
        }
      }
    )

    // Safety net: if INITIAL_SESSION never fires (e.g. network completely down),
    // clear the loading screen after 12 seconds so the user isn't stuck forever.
    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 12000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
  }, [])

  async function signIn(email: string, password: string): Promise<'owner' | 'tenant'> {
    // Sign out first to clear any stale/conflicting session in localStorage.
    // Without this, a leftover expired session can cause the subsequent
    // profile fetch to hang indefinitely.
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
