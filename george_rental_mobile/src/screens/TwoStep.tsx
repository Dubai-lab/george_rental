import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native'
import { supabase } from '../lib/supabase'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  cream:    '#F6F1E4',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  line:     '#E5E0D5',
}

interface Props {
  mode:     'challenge' | 'setup'
  onDone:   () => void      // code accepted
  onCancel: () => void      // challenge: sign out · setup: close
}

// Two-step sign-in with an authenticator app — the same codes as the website.
//  challenge: account already has an authenticator → enter the current code
//  setup:     add an authenticator to this account
export default function TwoStep({ mode, onDone, onCancel }: Props) {
  const [code,     setCode]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [secret,   setSecret]   = useState<string | null>(null)
  const [uri,      setUri]      = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (mode !== 'setup' || started.current) return
    started.current = true
    ;(async () => {
      try {
        // Clear half-finished attempts so a fresh key can always be issued
        const { data: existing } = await supabase.auth.mfa.listFactors()
        for (const f of existing?.all ?? []) {
          if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
        const { data, error: err } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
        })
        if (err) throw err
        setFactorId(data.id)
        setSecret(data.totp.secret)
        setUri(data.totp.uri)
      } catch (e: any) {
        setError(e?.message ?? 'Could not start two-step setup. Close and try again.')
      }
    })()
  }, [mode])

  async function openAuthenticator() {
    if (!uri) return
    try {
      await Linking.openURL(uri)
    } catch {
      setError('No authenticator app found. Install Google Authenticator, then add the key below by hand.')
    }
  }

  async function submit() {
    if (code.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true)
    setError(null)
    try {
      let id = factorId
      if (mode === 'challenge') {
        const { data, error: err } = await supabase.auth.mfa.listFactors()
        if (err) throw err
        id = data.totp.find(f => f.status === 'verified')?.id ?? null
      }
      if (!id) throw new Error('No authenticator found for this account.')
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code })
      if (err) throw err
      // Refresh so the app's state reflects the upgraded session everywhere
      await supabase.auth.refreshSession()
      onDone()
    } catch (e: any) {
      setCode('')
      setError(/invalid|expired/i.test(e?.message ?? '')
        ? 'That code is not correct or has expired. Wait for a new code and try again.'
        : (e?.message ?? 'Could not verify the code.'))
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (mode === 'setup' && factorId) await supabase.auth.mfa.unenroll({ factorId }).catch(() => {})
    onCancel()
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>George<Text style={{ color: C.crimson }}>Rental</Text></Text>

        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'setup' ? 'Set up two-step sign-in' : 'Two-step sign-in'}</Text>
          <Text style={styles.sub}>
            {mode === 'setup'
              ? 'Add a code from an authenticator app to your sign-in, so a stolen password is not enough.'
              : 'Enter the code from your authenticator app to finish signing in.'}
          </Text>

          {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

          {mode === 'setup' && (
            <View style={styles.setupBox}>
              <Text style={styles.step}>1. Install Google Authenticator (or Microsoft Authenticator / Authy).</Text>
              <Text style={styles.step}>2. Add George Rental to it:</Text>
              <TouchableOpacity style={[styles.outlineBtn, !uri && { opacity: 0.5 }]} onPress={openAuthenticator} disabled={!uri}>
                <Text style={styles.outlineBtnText}>Open my authenticator app</Text>
              </TouchableOpacity>
              <Text style={styles.keyHint}>or add this key in the app by hand (press and hold to copy):</Text>
              {secret
                ? <Text style={styles.key} selectable>{secret}</Text>
                : <ActivityIndicator color={C.stone} style={{ marginVertical: 8 }} />}
              <Text style={styles.step}>3. Type the 6-digit code it shows.</Text>
            </View>
          )}

          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#B8B2A7"
            autoFocus={mode === 'challenge'}
            accessibilityLabel="6-digit code"
          />

          <TouchableOpacity
            style={[styles.btn, (busy || (mode === 'setup' && !factorId)) && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy || (mode === 'setup' && !factorId)}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{mode === 'setup' ? 'Turn on two-step sign-in' : 'Verify and continue'}</Text>}
          </TouchableOpacity>

          {mode === 'challenge' && (
            <Text style={styles.help}>
              Lost the phone with your authenticator app? Contact the George Rental office on +231 88 605 5575. After checking it is you, they can reset it.
            </Text>
          )}

          <TouchableOpacity onPress={cancel} style={{ padding: 12, alignSelf: 'center' }}>
            <Text style={styles.link}>{mode === 'setup' ? 'Not now' : 'Sign out'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.midnight },
  scroll:  { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand:   { fontSize: 24, fontWeight: '800', color: C.cream, textAlign: 'center', marginBottom: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  title:   { fontSize: 20, fontWeight: '700', color: C.midnight, marginBottom: 6 },
  sub:     { fontSize: 14, color: C.stone, lineHeight: 20, marginBottom: 16 },
  error:   {
    fontSize: 13, color: C.crimson, backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, marginBottom: 14, lineHeight: 18, overflow: 'hidden',
  },
  setupBox: { backgroundColor: C.paper, borderRadius: 12, padding: 14, marginBottom: 16 },
  step:    { fontSize: 13, color: C.midnight, lineHeight: 20, marginBottom: 6 },
  keyHint: { fontSize: 12, color: C.stone, marginTop: 10, marginBottom: 6 },
  key:     {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 14, fontWeight: '700',
    color: C.midnight, marginBottom: 12,
  },
  outlineBtn:     {
    height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: C.midnight,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: C.midnight },
  label:   { fontSize: 13, fontWeight: '600', color: C.midnight, marginBottom: 6 },
  input:   {
    height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff',
    fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center', color: C.midnight, marginBottom: 16,
  },
  btn:     { height: 52, backgroundColor: C.crimson, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  help:    { fontSize: 12, color: C.stone, lineHeight: 18, textAlign: 'center', marginTop: 16 },
  link:    { fontSize: 14, fontWeight: '600', color: C.stone },
})
