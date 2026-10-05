import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  cream:    '#F6F1E4',
  dim:      'rgba(246,241,228,0.6)',
}

interface Props {
  name:          string
  label:         string                    // "Face ID", "fingerprint", …
  onUnlock:      () => Promise<boolean>    // shows the phone's biometric prompt
  onUsePassword: () => void                // signs out → password sign-in
}

// Shown instead of the app whenever it is opened (or returned to) with
// biometric sign-in turned on. Nothing behind it is rendered until it passes.
export default function Lock({ name, label, onUnlock, onUsePassword }: Props) {
  const [busy, setBusy]     = useState(false)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  async function tryUnlock() {
    if (busy) return
    setBusy(true)
    const ok = await onUnlock()
    setBusy(false)
    setFailed(!ok)
  }

  // Ask straight away when the screen appears
  useEffect(() => {
    if (started.current) return
    started.current = true
    tryUnlock()
  }, [])

  function confirmPassword() {
    Alert.alert(
      'Use password instead?',
      'You will be signed out and can sign in again with your email and password.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: onUsePassword },
      ],
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <View style={{ width: 18, height: 28, borderRadius: 3, backgroundColor: 'rgba(246,241,228,0.35)' }} />
        <View style={{ width: 14, height: 20, borderRadius: 3, backgroundColor: 'rgba(246,241,228,0.20)' }} />
        <View style={{ width: 12, height: 16, borderRadius: 3, backgroundColor: C.crimson }} />
      </View>
      <Text style={styles.brand}>George<Text style={{ color: C.crimson }}>Rental</Text></Text>

      <Text style={styles.title}>Welcome back{name ? `, ${name.split(' ')[0]}` : ''}</Text>
      <Text style={styles.sub}>
        {failed ? `That didn't work. Try ${label} again.` : `Use ${label} to open your account.`}
      </Text>

      <TouchableOpacity
        style={[styles.btn, busy && { opacity: 0.7 }]}
        onPress={tryUnlock}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`Sign in with ${label}`}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in with {label}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={confirmPassword} accessibilityRole="button" style={{ padding: 12 }}>
        <Text style={styles.link}>Use password instead</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.midnight, alignItems: 'center', justifyContent: 'center', padding: 32 },
  mark:    { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 12 },
  brand:   { fontSize: 26, fontWeight: '800', color: C.cream, marginBottom: 40 },
  title:   { fontSize: 22, fontWeight: '700', color: C.cream, marginBottom: 8, textAlign: 'center' },
  sub:     { fontSize: 14, color: C.dim, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  btn:     {
    height: 54, alignSelf: 'stretch', backgroundColor: C.crimson, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link:    { color: C.dim, fontSize: 14, fontWeight: '600' },
})
