import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView, useWindowDimensions,
} from 'react-native'

const C = {
  midnight: '#060914',
  navy:     '#0B1120',
  crimson:  '#D11F2C',
  cream:    '#F6F1E4',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  line:     '#E5E0D5',
  dim:      'rgba(246,241,228,0.55)',
  dimmer:   'rgba(246,241,228,0.25)',
}

/** Two building-block shapes matching the web logo mark */
function StoreMark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 14 }}>
      {/* Tall left block */}
      <View style={{ width: 18, height: 28, borderRadius: 3, backgroundColor: 'rgba(246,241,228,0.35)' }} />
      {/* Short middle block */}
      <View style={{ width: 14, height: 20, borderRadius: 3, backgroundColor: 'rgba(246,241,228,0.20)' }} />
      {/* Red accent block */}
      <View style={{ width: 12, height: 16, borderRadius: 3, backgroundColor: C.crimson }} />
    </View>
  )
}

/** Lightweight dot-grid drawn with repeated small Views */
function DotGrid() {
  const rows = 9
  const cols = 10
  const dots = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <View
          key={`${r}-${c}`}
          style={{
            width: 2, height: 2, borderRadius: 1,
            backgroundColor: 'rgba(246,241,228,0.09)',
            margin: 18,
          }}
        />
      )
    }
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', position: 'absolute', inset: 0 }} pointerEvents="none">
      {dots}
    </View>
  )
}

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
}

export default function SignIn({ onSignIn }: Props) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const { width } = useWindowDimensions()
  const isTablet   = width >= 600
  const innerWidth = isTablet ? Math.min(480, width - 80) : undefined

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await onSignIn(email.trim(), password)
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      {/* ── Background decorations ── */}
      <DotGrid />

      {/* Crimson radial glow — top-right */}
      <View style={styles.glow} pointerEvents="none" />

      {/* Secondary soft glow — bottom-left */}
      <View style={styles.glowSoft} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, isTablet && { paddingHorizontal: 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Branding section ── */}
          <View style={[styles.brand, isTablet && { width: innerWidth, alignSelf: 'center' }]}>
            <StoreMark />
            <Text style={styles.brandName}>
              George<Text style={{ color: C.crimson }}>Rental</Text>
            </Text>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>TENANT PORTAL</Text>
            </View>
            <Text style={styles.brandTagline}>
              Manage rent · Submit payments · Track receipts
            </Text>
          </View>

          {/* ── Form card ── */}
          <View style={[styles.card, isTablet && { width: innerWidth, alignSelf: 'center' }]}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={C.stone}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor={C.stone}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Sign in →</Text>
              }
            </TouchableOpacity>

            <Text style={styles.footer}>
              Need help?{' '}
              <Text style={{ color: C.crimson, fontWeight: '600' }}>+231 88 605 5575</Text>
            </Text>
          </View>

          {/* ── Bottom tagline ── */}
          <Text style={styles.bottomTag}>
            George Rental · Monrovia, Liberia
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.midnight,
  },
  glow: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(209,31,44,0.22)',
    // React Native doesn't support CSS blur, so we layer multiple circles
  },
  glowSoft: {
    position: 'absolute',
    bottom: -180,
    left: -180,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(11,17,32,0.8)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  /* Branding */
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: C.cream,
    letterSpacing: -0.5,
  },
  brandBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(246,241,228,0.18)',
    backgroundColor: 'rgba(246,241,228,0.06)',
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.dim,
    letterSpacing: 2,
  },
  brandTagline: {
    marginTop: 12,
    fontSize: 13,
    color: C.dimmer,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  /* Card */
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.midnight,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: C.stone,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.midnight,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.midnight,
    backgroundColor: C.paper,
  },
  btn: {
    height: 52,
    backgroundColor: C.crimson,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: C.crimson,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: C.stone,
  },

  bottomTag: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(246,241,228,0.2)',
    marginTop: 24,
    letterSpacing: 0.5,
  },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.line },
  dividerText: { fontSize: 12, color: C.stone, marginHorizontal: 10 },

  demoBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  demoBtnText: { fontSize: 15, fontWeight: '700', color: C.midnight },
  demoBtnSub:  { fontSize: 11, color: C.stone, marginTop: 2 },
})
