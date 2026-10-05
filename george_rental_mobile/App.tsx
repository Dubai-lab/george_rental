import React, { useState, useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet, AppState, Alert } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from './src/hooks/useAuth'
import AppNavigator from './src/navigation/AppNavigator'
import TermsScreen, { hasAgreedToTerms } from './src/screens/Terms'
import Lock from './src/screens/Lock'
import * as biometrics from './src/lib/biometrics'

// How long the app may sit in the background before it locks again
const RELOCK_AFTER_MS = 30_000

export default function App() {
  const { profile, mfa, loading, signIn, signOut } = useAuth()
  const [termsChecked, setTermsChecked] = useState(false)
  const [termsAgreed, setTermsAgreed]   = useState(false)

  // ── Face ID / fingerprint lock ─────────────────────────────────────────────
  const [locked,   setLocked]   = useState(false)
  const [bioReady, setBioReady] = useState(false)   // start-up check finished
  const [bioLabel, setBioLabel] = useState('biometrics')
  const signedInNow  = useRef(false)   // just typed the password → don't lock
  const prompting    = useRef(false)   // the system prompt is on screen
  const leftAt       = useRef<number | null>(null)
  const profileRef   = useRef(profile)
  profileRef.current = profile

  useEffect(() => {
    hasAgreedToTerms().then(agreed => {
      setTermsAgreed(agreed)
      setTermsChecked(true)
    })
    biometrics.getLabel().then(setBioLabel)
  }, [])

  // App start: a saved session + biometric sign-in turned on → start locked
  useEffect(() => {
    if (loading || bioReady) return
    ;(async () => {
      if (profileRef.current && !signedInNow.current
          && await biometrics.isEnabled() && await biometrics.isAvailable()) {
        setLocked(true)
      }
      setBioReady(true)
    })()
  }, [loading, bioReady])

  // Coming back from the background after a while → lock again
  useEffect(() => {
    const sub = AppState.addEventListener('change', async state => {
      if (prompting.current) return            // the biometric prompt itself changes app state
      if (state === 'background') { leftAt.current = Date.now(); return }
      if (state !== 'active' || leftAt.current == null) return
      const away = Date.now() - leftAt.current
      leftAt.current = null
      if (away >= RELOCK_AFTER_MS && profileRef.current
          && await biometrics.isEnabled() && await biometrics.isAvailable()) {
        setLocked(true)
      }
    })
    return () => sub.remove()
  }, [])

  async function unlock(): Promise<boolean> {
    prompting.current = true
    const ok = await biometrics.authenticate('Sign in to George Rental')
    prompting.current = false
    leftAt.current = null
    if (ok) setLocked(false)
    return ok
  }

  async function handleSignOut() {
    await biometrics.setEnabled(false)   // the next person must opt in themselves
    setLocked(false)
    signedInNow.current = false
    await signOut()
  }

  async function handleSignIn(email: string, password: string) {
    signedInNow.current = true
    try {
      await signIn(email, password)
    } catch (e) {
      signedInNow.current = false
      throw e
    }
    offerBiometrics()
  }

  // Once, after the first successful sign-in on a phone that supports it
  async function offerBiometrics() {
    if (!(await biometrics.isAvailable()) || await biometrics.isEnabled() || await biometrics.wasOffered()) return
    await biometrics.markOffered()
    const label = await biometrics.getLabel()
    Alert.alert(
      `Sign in with ${label}?`,
      `Next time, open George Rental with ${label} instead of typing your password. You can change this in Profile.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Turn on',
          onPress: async () => {
            prompting.current = true
            const ok = await biometrics.authenticate(`Confirm ${label}`)
            prompting.current = false
            if (ok) await biometrics.setEnabled(true)
          },
        },
      ],
    )
  }

  if (loading || !termsChecked || !bioReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#D11F2C" size="large" />
      </View>
    )
  }

  if (!termsAgreed) {
    return <TermsScreen onAgree={() => setTermsAgreed(true)} />
  }

  if (locked && profile) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Lock name={profile.full_name} label={bioLabel} onUnlock={unlock} onUsePassword={handleSignOut} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator profile={profile} mfa={mfa} onSignIn={handleSignIn} onSignOut={handleSignOut} />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#060914',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
