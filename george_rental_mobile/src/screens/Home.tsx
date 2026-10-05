import React, { useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Profile, Lease, Payment } from '../types'
import { useState } from 'react'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  cream:    '#F6F1E4',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  stone2:   '#9E9893',
  line:     '#E5E0D5',
  mint:     '#2FB875',
}

function fmtMonth(ym: string) {
  return new Date(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface Props { profile: Profile }

export default function Home({ profile }: Props) {
  const nav = useNavigation<any>()
  const { width } = useWindowDimensions()
  const isTablet = width >= 600
  const [lease,    setLease]    = useState<Lease | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refresh,  setRefresh]  = useState(false)

  async function load() {
    const { data: leaseData } = await supabase
      .from('leases')
      .select('*, store:stores(code, name, rent_usd)')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()
    setLease(leaseData)

    if (leaseData) {
      const { data: pmts } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', leaseData.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setPayments(pmts ?? [])
    }
    setLoading(false)
    setRefresh(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))

  function onRefresh() { setRefresh(true); load() }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentPmt   = payments.find(p => p.period_month === currentMonth)

  function rentStatus() {
    if (!lease) return { label: 'No active lease', color: C.stone2 }
    if (!currentPmt) return { label: 'Payment Due', color: C.crimson }
    if (currentPmt.status === 'confirmed') return { label: 'Paid ✓', color: C.mint }
    if (currentPmt.status === 'pending')  return { label: 'Pending review', color: '#E9B949' }
    return { label: 'Rejected — resubmit', color: C.crimson }
  }

  const status = rentStatus()

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.crimson} size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.crimson} />}
    >
      <View style={isTablet ? { maxWidth: 600, width: '100%', alignSelf: 'center' } : {}}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetSub}>Good day,</Text>
        <Text style={styles.greetName}>{profile.full_name ?? 'Tenant'} 👋</Text>
      </View>

      {/* Rent card */}
      <View style={styles.rentCard}>
        <View style={styles.rentCardTop}>
          <Text style={styles.rentCardLabel}>
            {lease ? `${(lease.store as any)?.code} · ${(lease.store as any)?.name}` : 'No Active Lease'}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.color + '22' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.rentAmount}>
          ${lease ? (lease.store as any)?.rent_usd?.toLocaleString() ?? lease.monthly_rent_usd.toLocaleString() : '—'}
          <Text style={styles.rentPer}> /month</Text>
        </Text>
        <Text style={styles.rentMonth}>{fmtMonth(currentMonth)}</Text>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        {[
          { label: 'Pay Rent',    emoji: '💳', screen: 'PayRent' },
          { label: 'Receipts',    emoji: '🧾', screen: 'Receipts' },
          { label: 'Maintenance', emoji: '🔧', screen: 'Maintenance' },
        ].map(a => (
          <TouchableOpacity key={a.screen} style={styles.actionCard} onPress={() => nav.navigate(a.screen)}>
            <Text style={styles.actionEmoji}>{a.emoji}</Text>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent payments */}
      {payments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {payments.slice(0, 4).map(p => (
            <View key={p.id} style={styles.pmtRow}>
              <View>
                <Text style={styles.pmtMonth}>{fmtMonth(p.period_month)}</Text>
                <Text style={styles.pmtMethod}>
                  {p.method === 'mtn_momo' ? 'MTN MoMo' : p.method === 'orange_money' ? 'Orange Money' : p.method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pmtAmount}>${Number(p.amount_usd).toLocaleString()}</Text>
                <View style={[styles.pmtPill, {
                  backgroundColor: p.status === 'confirmed' ? C.mint + '22' : p.status === 'pending' ? '#E9B94922' : C.crimson + '22',
                }]}>
                  <Text style={[styles.pmtPillText, {
                    color: p.status === 'confirmed' ? C.mint : p.status === 'pending' ? '#C89A30' : C.crimson,
                  }]}>
                    {p.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {/* No lease state */}
      {!lease && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🏪</Text>
          <Text style={styles.emptyTitle}>No active lease</Text>
          <Text style={styles.emptySub}>Contact the office to get set up.</Text>
          <Text style={styles.emptyPhone}>+231 88 605 5575</Text>
        </View>
      )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.paper },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting:    { marginBottom: 20 },
  greetSub:    { fontSize: 13, color: C.stone2 },
  greetName:   { fontSize: 22, fontWeight: '700', color: C.midnight, marginTop: 2 },
  rentCard:    {
    backgroundColor: C.midnight,
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
  },
  rentCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  rentCardLabel: { fontSize: 12, color: 'rgba(246,241,228,0.55)', fontWeight: '600', letterSpacing: 0.5 },
  statusPill:    { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  rentAmount:    { fontSize: 32, fontWeight: '700', color: C.cream },
  rentPer:       { fontSize: 15, fontWeight: '400', color: 'rgba(246,241,228,0.5)' },
  rentMonth:     { fontSize: 13, color: 'rgba(246,241,228,0.45)', marginTop: 4 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: C.midnight, marginBottom: 12 },
  actions:       { flexDirection: 'row', gap: 10, marginBottom: 28 },
  actionCard:    {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: C.line,
  },
  actionEmoji:   { fontSize: 24, marginBottom: 6 },
  actionLabel:   { fontSize: 12, fontWeight: '600', color: C.midnight, textAlign: 'center' },
  pmtRow:        {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.line,
  },
  pmtMonth:      { fontSize: 14, fontWeight: '600', color: C.midnight },
  pmtMethod:     { fontSize: 12, color: C.stone2, marginTop: 2 },
  pmtAmount:     { fontSize: 15, fontWeight: '700', color: C.midnight },
  pmtPill:       { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  pmtPillText:   { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyBox:      { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji:    { fontSize: 40, marginBottom: 10 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.midnight, marginBottom: 6 },
  emptySub:      { fontSize: 14, color: C.stone, marginBottom: 4 },
  emptyPhone:    { fontSize: 15, fontWeight: '600', color: C.midnight },
})
