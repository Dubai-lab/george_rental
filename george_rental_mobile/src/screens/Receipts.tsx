import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, useWindowDimensions,
  Modal, Image,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { getSignedUrl } from '../lib/files'
import { Profile, Payment } from '../types'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  stone2:   '#9E9893',
  line:     '#E5E0D5',
  mint:     '#2FB875',
}

function fmtMonth(ym: string) {
  return new Date(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function addMonthsYM(ym: string, n: number): string {
  const d = new Date(ym + '-01')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7)
}

function periodRangeLabel(startMonth: string, count: number): string {
  if (!count || count <= 1) return fmtMonth(startMonth)
  const endMonth = addMonthsYM(startMonth, count - 1)
  const start = new Date(startMonth + '-01').toLocaleDateString('en-US', { month: 'short' })
  const end   = new Date(endMonth   + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${start} – ${end} (${count} months)`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props { profile: Profile }

export default function Receipts({ profile }: Props) {
  const { width } = useWindowDimensions()
  const isTablet = width >= 600
  const [payments,   setPayments]   = useState<Payment[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function openProof(url: string) {
    try {
      setPreviewUrl(await getSignedUrl(url))
    } catch {
      Alert.alert('Could not open', 'This file could not be loaded. Please try again.')
    }
  }
  const [loading,  setLoading]  = useState(true)
  const [refresh,  setRefresh]  = useState(false)

  async function load() {
    const { data } = await supabase
      .from('payments')
      .select('*, lease:leases(lease_code, store:stores(code, name))')
      .eq('tenant_id', profile.id)
      .order('created_at', { ascending: false })
    setPayments(data ?? [])
    setLoading(false)
    setRefresh(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))
  function onRefresh() { setRefresh(true); load() }

  function statusStyle(s: string) {
    if (s === 'confirmed') return { bg: C.mint + '20', color: C.mint }
    if (s === 'pending')   return { bg: '#E9B94920', color: '#C89A30' }
    return { bg: C.crimson + '20', color: C.crimson }
  }

  function statusLabel(s: string) {
    if (s === 'confirmed') return 'Confirmed'
    if (s === 'pending')   return 'Pending'
    return 'Rejected'
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={C.crimson} size="large" /></View>
  }

  if (payments.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
        <Text style={styles.emptyTitle}>No payments yet</Text>
        <Text style={styles.emptySub}>Your receipts will appear here after you pay rent.</Text>
      </View>
    )
  }

  const tabletCardStyle = isTablet ? { maxWidth: 600, width: '100%' as const, alignSelf: 'center' as const } : {}

  return (
    <>
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={payments}
      keyExtractor={p => p.id}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.crimson} />}
      ListHeaderComponent={<Text style={[styles.pageTitle, isTablet && { alignSelf: 'center' as const }]}>Receipts</Text>}
      renderItem={({ item: p }) => {
        const ss = statusStyle(p.status)
        const store = (p.lease as any)?.store
        return (
          <View style={[styles.card, tabletCardStyle]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.period}>{periodRangeLabel(p.period_month, p.months_count ?? 1)}</Text>
                {store && <Text style={styles.storeTag}>{store.code} · {store.name}</Text>}
              </View>
              <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                <Text style={[styles.pillText, { color: ss.color }]}>{statusLabel(p.status)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.key}>Amount paid</Text>
              <Text style={styles.val}>${Number(p.amount_usd).toLocaleString()}</Text>
            </View>
            {p.amount_lrd != null && (
              <View style={styles.row}>
                <Text style={styles.key}>LRD equivalent</Text>
                <Text style={styles.val}>L${Number(p.amount_lrd).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.key}>Method</Text>
              <Text style={styles.val}>
                {p.method === 'mtn_momo' ? 'MTN MoMo' : p.method === 'orange_money' ? 'Orange Money' : p.method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
              </Text>
            </View>
            {p.receipt_number && (
              <View style={styles.row}>
                <Text style={styles.key}>Receipt #</Text>
                <Text style={[styles.val, { color: C.mint, fontFamily: 'monospace' }]}>{p.receipt_number}</Text>
              </View>
            )}
            {p.confirmed_at && (
              <View style={styles.row}>
                <Text style={styles.key}>Confirmed</Text>
                <Text style={styles.val}>{fmtDate(p.confirmed_at)}</Text>
              </View>
            )}
            {p.notes && (
              <View style={[styles.noteBox, { backgroundColor: p.status === 'rejected' ? '#FEF2F2' : '#F9F7F3' }]}>
                <Text style={styles.noteLabel}>{p.status === 'rejected' ? 'Reason:' : 'Note:'}</Text>
                <Text style={styles.noteText}>{p.notes}</Text>
              </View>
            )}
            {p.proof_url && (
              <TouchableOpacity style={styles.proofBtn} onPress={() => openProof(p.proof_url!)}>
                <Text style={styles.proofBtnText}>📎 View proof</Text>
              </TouchableOpacity>
            )}
          </View>
        )
      }}
    />

    {/* Proof image modal */}
    <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        {/* Close button row */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
          <TouchableOpacity
            onPress={() => setPreviewUrl(null)}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>✕ Close</Text>
          </TouchableOpacity>
        </View>
        {/* Tap background to close */}
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setPreviewUrl(null)}
        >
          {previewUrl && (
            <Image
              source={{ uri: previewUrl }}
              style={{ width: '92%', height: '90%' }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.paper },
  content:     { padding: 20, paddingBottom: 40 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pageTitle:   { fontSize: 24, fontWeight: '700', color: C.midnight, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: C.midnight, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: C.stone, textAlign: 'center' },
  card:        {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: C.line,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  period:      { fontSize: 16, fontWeight: '700', color: C.midnight },
  storeTag:    { fontSize: 12, color: C.stone2, marginTop: 2 },
  pill:        { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:    { fontSize: 12, fontWeight: '600' },
  divider:     { height: 1, backgroundColor: C.line, marginBottom: 12 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  key:         { fontSize: 13, color: C.stone },
  val:         { fontSize: 13, fontWeight: '600', color: C.midnight },
  noteBox:     { borderRadius: 8, padding: 10, marginTop: 8 },
  noteLabel:   { fontSize: 12, fontWeight: '700', color: C.midnight, marginBottom: 2 },
  noteText:    { fontSize: 12, color: C.stone },
  proofBtn:    {
    marginTop: 10, borderWidth: 1, borderColor: C.line,
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  proofBtnText: { fontSize: 13, fontWeight: '600', color: C.midnight },
})
