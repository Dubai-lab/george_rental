import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ActivityIndicator, useWindowDimensions, ScrollView, Switch, Modal } from 'react-native'
import { supabase } from '../lib/supabase'
import { Profile as ProfileType } from '../types'
import { MfaState } from '../hooks/useAuth'
import { getSignedUrl } from '../lib/files'
import * as biometrics from '../lib/biometrics'
import TwoStep from './TwoStep'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  stone2:   '#9E9893',
  line:     '#E5E0D5',
}

interface Props {
  profile: ProfileType
  mfa: MfaState | null
  onSignOut: () => void
}

export default function ProfileScreen({ profile, mfa, onSignOut }: Props) {
  // ── Account security ──
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioOn,        setBioOn]        = useState(false)
  const [bioLabel,     setBioLabel]     = useState('biometrics')
  const [setupOpen,    setSetupOpen]    = useState(false)
  const [mfaBusy,      setMfaBusy]      = useState(false)
  const twoStepOn = !!mfa?.enrolled

  useEffect(() => {
    biometrics.isAvailable().then(setBioAvailable)
    biometrics.isEnabled().then(setBioOn)
    biometrics.getLabel().then(setBioLabel)
  }, [])

  async function toggleBiometrics(next: boolean) {
    // Turning it on OR off needs the face/fingerprint, so nobody else can change it
    const ok = await biometrics.authenticate(next ? `Turn on ${bioLabel} sign-in` : `Turn off ${bioLabel} sign-in`)
    if (!ok) return
    await biometrics.setEnabled(next)
    setBioOn(next)
  }

  function turnOffTwoStep() {
    Alert.alert('Turn off two-step sign-in?', 'Your account will be protected by your password only.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off', style: 'destructive',
        onPress: async () => {
          setMfaBusy(true)
          try {
            const { data, error } = await supabase.auth.mfa.listFactors()
            if (error) throw error
            for (const f of data.all) {
              const { error: e } = await supabase.auth.mfa.unenroll({ factorId: f.id })
              if (e) throw e
            }
            await supabase.auth.refreshSession()
          } catch (e: any) {
            Alert.alert('Could not turn it off', e?.message ?? 'Please try again.')
          } finally {
            setMfaBusy(false)
          }
        },
      },
    ])
  }

  async function openAgreement(url: string) {
    try {
      await Linking.openURL(await getSignedUrl(url))
    } catch {
      Alert.alert('Could not open', 'The agreement could not be loaded. Please try again.')
    }
  }

  const { width } = useWindowDimensions()
  const isTablet = width >= 600
  const [agreementUrl, setAgreementUrl] = useState<string | null>(null)
  const [leaseLoading, setLeaseLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leases')
      .select('agreement_url')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        setAgreementUrl(data?.agreement_url ?? null)
        setLeaseLoading(false)
      })
  }, [profile.id])

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onSignOut },
    ])
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.paper }} contentContainerStyle={styles.root}>
      <View style={isTablet ? { maxWidth: 560, width: '100%', alignSelf: 'center' } : { width: '100%' }}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(profile.full_name ?? 'T').charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{profile.full_name ?? 'Tenant'}</Text>
      <Text style={styles.email}>{profile.email}</Text>

      <View style={styles.card}>
        {[
          ['Role',  'Tenant'],
          ['Email', profile.email],
          ['Phone', profile.phone ?? 'Not set'],
        ].map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.key}>{k}</Text>
            <Text style={styles.val}>{v}</Text>
          </View>
        ))}
      </View>

      {/* Rental Agreement */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rental Agreement</Text>
        {leaseLoading ? (
          <ActivityIndicator size="small" color={C.stone2} />
        ) : agreementUrl ? (
          <TouchableOpacity onPress={() => openAgreement(agreementUrl)}>
            <Text style={styles.agreementLink}>View Rental Agreement</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noAgreement}>No agreement uploaded yet.</Text>
        )}
      </View>

      {/* Account security */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Security</Text>

        <View style={styles.secRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.secTitle}>Sign in with {bioLabel}</Text>
            <Text style={styles.secSub}>
              {bioAvailable
                ? `Open the app with ${bioLabel} instead of your password.`
                : 'Set up a fingerprint or face in your phone settings to use this.'}
            </Text>
          </View>
          <Switch
            value={bioOn}
            onValueChange={toggleBiometrics}
            disabled={!bioAvailable}
            trackColor={{ true: C.crimson, false: C.line }}
            accessibilityLabel={`Sign in with ${bioLabel}`}
          />
        </View>

        <View style={[styles.secRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.secTitle}>Two-step sign-in · {twoStepOn ? 'On' : 'Off'}</Text>
            <Text style={styles.secSub}>
              {twoStepOn
                ? 'Signing in needs your password and a code from your authenticator app.'
                : 'Add a code from an authenticator app, so a stolen password is not enough.'}
            </Text>
          </View>
          {mfaBusy ? (
            <ActivityIndicator size="small" color={C.stone2} />
          ) : (
            <TouchableOpacity onPress={twoStepOn ? turnOffTwoStep : () => setSetupOpen(true)} style={styles.secBtn}>
              <Text style={styles.secBtnText}>{twoStepOn ? 'Turn off' : 'Turn on'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={setupOpen} animationType="slide" onRequestClose={() => setSetupOpen(false)}>
        <TwoStep mode="setup" onDone={() => setSetupOpen(false)} onCancel={() => setSetupOpen(false)} />
      </Modal>

      <View style={styles.card}>
        <Text style={styles.contactTitle}>Need help?</Text>
        <Text style={styles.contactLine}>📍 Bob Taylor Road, Red Light, Paynesville, Liberia</Text>
        <Text style={styles.contactLine}>📞 +231 88 605 5575</Text>
        <Text style={styles.contactLine}>✉️ eg8217178@gmail.com</Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  secRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  secTitle:   { fontSize: 14, fontWeight: '600', color: C.midnight },
  secSub:     { fontSize: 12, color: C.stone, marginTop: 3, lineHeight: 17 },
  secBtn:     { paddingHorizontal: 14, height: 36, borderRadius: 9, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  secBtnText: { fontSize: 13, fontWeight: '700', color: C.midnight },
  root:          { flexGrow: 1, backgroundColor: C.paper, padding: 24, paddingBottom: 60, alignItems: 'center' },
  avatar:        {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.crimson, alignItems: 'center', justifyContent: 'center',
    marginTop: 20, marginBottom: 12,
  },
  avatarText:    { fontSize: 32, fontWeight: '700', color: '#fff' },
  name:          { fontSize: 22, fontWeight: '700', color: C.midnight, marginBottom: 4 },
  email:         { fontSize: 14, color: C.stone, marginBottom: 28 },
  card:          {
    width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: C.line, marginBottom: 14,
  },
  row:           {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line,
  },
  key:           { fontSize: 13, color: C.stone },
  val:           { fontSize: 13, fontWeight: '600', color: C.midnight },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: C.midnight, marginBottom: 10 },
  agreementLink: { fontSize: 14, fontWeight: '600', color: C.crimson, textDecorationLine: 'underline' },
  noAgreement:   { fontSize: 13, color: C.stone2 },
  contactTitle:  { fontSize: 14, fontWeight: '700', color: C.midnight, marginBottom: 10 },
  contactLine:   { fontSize: 13, color: C.stone, marginBottom: 6 },
  signOutBtn:    {
    width: '100%', height: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.crimson,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  signOutText:   { fontSize: 15, fontWeight: '600', color: C.crimson },
})
