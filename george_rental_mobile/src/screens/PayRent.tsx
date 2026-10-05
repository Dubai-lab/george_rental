import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Profile, Lease } from '../types'

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

const METHODS = [
  { id: 'mtn_momo',      label: 'MTN MoMo',     emoji: '📱', desc: 'Dial *156# · most popular'          },
  { id: 'orange_money',  label: 'Orange Money',  emoji: '🟠', desc: 'Dial *144# · Orange wallet'         },
  { id: 'bank_transfer', label: 'Bank Transfer', emoji: '🏦', desc: 'Transfer to George Rental account'  },
]

const MONTH_PRESETS = [1, 2, 3, 6, 12]

// ── Billing helpers (anchored to dueDay) ─────────────────────────────────────
// dueDay is clamped to each month's actual days, so a 31st-of-month lease uses
// the 28th/29th in February and the 30th in April/June/Sep/Nov.

function addMonthsYM(ym: string, n: number): string {
  const d = new Date(ym + '-01')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7)
}

// Last day of a given month (e.g. Feb 2026 → 28)
function lastDayOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function clampDay(year: number, month: number, dueDay: number): number {
  return Math.min(dueDay, lastDayOf(year, month))
}

function billingStartDate(periodMonth: string, dueDay: number): Date {
  const d = new Date(periodMonth + '-01')
  d.setDate(clampDay(d.getFullYear(), d.getMonth(), dueDay))
  return d
}

function billingEndDate(periodMonth: string, monthsCount: number, dueDay: number): Date {
  // Move to the month where next payment is due, clamp the day, then subtract 1
  const next = new Date(periodMonth + '-01')
  next.setMonth(next.getMonth() + monthsCount)
  next.setDate(clampDay(next.getFullYear(), next.getMonth(), dueDay))
  next.setDate(next.getDate() - 1)
  return next
}

function nextDueDateFor(periodMonth: string, monthsCount: number, dueDay: number): Date {
  const d = new Date(periodMonth + '-01')
  d.setMonth(d.getMonth() + monthsCount)
  d.setDate(clampDay(d.getFullYear(), d.getMonth(), dueDay))
  return d
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function periodRangeLabel(periodMonth: string, monthsCount: number, dueDay?: number | null): string {
  if (!dueDay) {
    const d = new Date(periodMonth + '-01')
    if (monthsCount <= 1) return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const end = new Date(periodMonth + '-01')
    end.setMonth(end.getMonth() + monthsCount - 1)
    return `${d.toLocaleDateString('en-US', { month: 'short' })} – ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${monthsCount} months)`
  }
  const start = billingStartDate(periodMonth, dueDay)
  const end   = billingEndDate(periodMonth, monthsCount, dueDay)
  if (monthsCount <= 1) return `${fmtShortDate(start)} – ${fmtDate(end)}`
  return `${fmtShortDate(start)} – ${fmtDate(end)} (${monthsCount} months)`
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { profile: Profile }

export default function PayRent({ profile }: Props) {
  const { width } = useWindowDimensions()
  const isTablet = width >= 600
  const [step,        setStep]        = useState(0)   // 0=method+months 1=proof 2=confirm
  const [method,      setMethod]      = useState<string | null>(null)
  const [monthsCount, setMonthsCount] = useState(1)
  const [ref,         setRef]         = useState('')
  const [proof,       setProof]       = useState<{ uri: string; name: string; type: string } | null>(null)
  const [lease,       setLease]       = useState<Lease | null>(null)
  const [fxRate,      setFxRate]      = useState(180)
  const [submitting,  setSubmitting]  = useState(false)
  const [done,        setDone]        = useState(false)
  const [momoNumber,    setMomoNumber]    = useState('088 605 5575')
  const [momoAccName,   setMomoAccName]   = useState('George Rental')
  const [orangeNumber,  setOrangeNumber]  = useState('')
  const [orangeAccName, setOrangeAccName] = useState('George Rental')
  const [bankList,      setBankList]      = useState<{ bank: string; account: string; name: string }[]>([])
  const [lastPayment, setLastPayment] = useState<{ period_month: string; months_count: number } | null>(null)
  // startMonth = yyyy-MM of the current billing cycle to pay for
  const [startMonth,  setStartMonth]  = useState(new Date().toISOString().slice(0, 7))
  // dueDay derived from lease.start_date
  const [dueDay,      setDueDay]      = useState<number | null>(null)

  useFocusEffect(useCallback(() => {
    setStep(0); setMethod(null); setRef(''); setProof(null); setDone(false); setMonthsCount(1)
    loadAll()
  }, []))

  async function loadAll() {
    const [leaseData, fxData, settingsData, lastPayData] = await Promise.all([
      supabase
        .from('leases')
        .select('*, store:stores(code, name, rent_usd)')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('fx_rates').select('rate').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('payment_settings').select('momo_number,momo_name,orange_number,orange_name,banks').maybeSingle(),
      supabase
        .from('payments')
        .select('period_month, months_count')
        .eq('tenant_id', profile.id)
        .eq('status', 'confirmed')
        .order('period_month', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (leaseData.data) {
      setLease(leaseData.data)
      const day = leaseData.data.start_date ? new Date(leaseData.data.start_date).getDate() : null
      setDueDay(day)

      // Set starting month: next unpaid period, or lease start month
      if (lastPayData.data) {
        setLastPayment(lastPayData.data)
        setStartMonth(addMonthsYM(lastPayData.data.period_month, lastPayData.data.months_count ?? 1))
      } else {
        setLastPayment(null)
        setStartMonth(leaseData.data.start_date
          ? leaseData.data.start_date.slice(0, 7)
          : new Date().toISOString().slice(0, 7))
      }
    }
    if (fxData.data) setFxRate(fxData.data.rate)
    if (settingsData.data) {
      if (settingsData.data.momo_number)   setMomoNumber(settingsData.data.momo_number)
      if (settingsData.data.momo_name)     setMomoAccName(settingsData.data.momo_name)
      if (settingsData.data.orange_number) setOrangeNumber(settingsData.data.orange_number)
      if (settingsData.data.orange_name)   setOrangeAccName(settingsData.data.orange_name)
      if (Array.isArray(settingsData.data.banks)) setBankList(settingsData.data.banks)
    }
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to photos to upload proof.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false })
    if (!result.canceled && result.assets[0]) {
      const asset    = result.assets[0]
      const ext      = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeType = asset.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg')
      setProof({ uri: asset.uri, name: `proof.${ext}`, type: mimeType })
    }
  }

  async function submit() {
    if (!lease) return
    setSubmitting(true)
    try {
      const rent     = (lease.store as any)?.rent_usd ?? lease.monthly_rent_usd
      const totalUsd = rent * monthsCount

      let proofUrl: string | null = null
      if (proof) {
        const path = `${profile.id}/${Date.now()}.${proof.name.split('.').pop()}`
        const resp        = await fetch(proof.uri)
        const arrayBuffer = await resp.arrayBuffer()
        const uint8       = new Uint8Array(arrayBuffer)
        if (uint8.length === 0) throw new Error('Could not read the selected image. Please try again.')
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, uint8, { contentType: proof.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path)
        proofUrl = urlData.publicUrl
      }

      const { data: inserted, error } = await supabase.from('payments').insert({
        lease_id:        lease.id,
        tenant_id:       profile.id,
        store_id:        lease.store_id,
        period_month:    startMonth,
        months_count:    monthsCount,
        due_day:         dueDay,
        amount_usd:      totalUsd,
        amount_lrd:      Math.round(totalUsd * fxRate),
        fx_rate:         fxRate,
        method,
        transaction_ref: ref.trim() || null,
        proof_url:       proofUrl,
        status:          'pending',
      }).select('id').single()
      if (error) throw error
      if (inserted?.id) {
        supabase.functions.invoke('notify-payment', { body: { payment_id: inserted.id, action: 'submitted' } }).catch(() => {})
      }
      setDone(true)
    } catch (err: any) {
      Alert.alert('Submission failed', err.message ?? 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const rent      = (lease?.store as any)?.rent_usd ?? lease?.monthly_rent_usd ?? 0
  const totalUsd  = rent * monthsCount
  const coverageLabel = periodRangeLabel(startMonth, monthsCount, dueDay)

  // Banner data
  const paidThrough = lastPayment && dueDay ? billingEndDate(lastPayment.period_month, lastPayment.months_count, dueDay) : null
  const nextDue     = dueDay
    ? (lastPayment
        ? nextDueDateFor(lastPayment.period_month, lastPayment.months_count, dueDay)
        : (lease?.start_date ? new Date(lease.start_date) : null))
    : null
  const noReminderUntil = dueDay ? nextDueDateFor(startMonth, monthsCount, dueDay) : null

  if (!lease) {
    return (
      <View style={styles.center}>
        <Text style={styles.noLease}>No active lease found.</Text>
        <Text style={styles.noLeaseSub}>Contact the office to get set up.</Text>
      </View>
    )
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>✅</Text>
        <Text style={styles.doneTitle}>Payment Submitted!</Text>
        <Text style={styles.doneSub}>
          Your payment for{'\n'}<Text style={{ fontWeight: '700' }}>{coverageLabel}</Text>{'\n'}is under review. You'll receive an email once confirmed.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => { setStep(0); setDone(false); setMethod(null); setRef(''); setProof(null); setMonthsCount(1) }}>
          <Text style={styles.btnText}>Submit another</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={isTablet ? { maxWidth: 600, width: '100%', alignSelf: 'center' } : {}}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Pay Rent</Text>
        <Text style={styles.pageSub}>{(lease.store as any)?.code} · {(lease.store as any)?.name}</Text>
        <View style={styles.steps}>
          {['Method', 'Proof', 'Confirm'].map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && { backgroundColor: C.crimson }]}>
                <Text style={[styles.stepNum, i <= step && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === step && { color: C.midnight, fontWeight: '600' }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Amount card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>{coverageLabel} · {(lease.store as any)?.code}</Text>
        <Text style={styles.amountUsd}>${totalUsd.toLocaleString()}</Text>
        {monthsCount > 1 && <Text style={styles.amountBreakdown}>{monthsCount} × ${rent.toLocaleString()}/mo</Text>}
        <Text style={styles.amountLrd}>≈ L${Math.round(totalUsd * fxRate).toLocaleString()} at {fxRate} LRD/USD</Text>
      </View>

      {/* Step 0 — Months + Method */}
      {step === 0 && (
        <>
          {/* Billing status banner */}
          <View style={[styles.banner, paidThrough ? styles.bannerGreen : styles.bannerGrey]}>
            <Text style={styles.bannerIcon}>{paidThrough ? '✅' : '📅'}</Text>
            <View style={{ flex: 1 }}>
              {paidThrough ? (
                <>
                  <Text style={styles.bannerTitle}>Rent paid through {fmtDate(paidThrough)}</Text>
                  <Text style={styles.bannerSub}>
                    Next rent due:{' '}
                    <Text style={{ fontWeight: '700', color: C.midnight }}>{nextDue ? fmtDate(nextDue) : '—'}</Text>
                    {'\n'}Choose how many months to pay below.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.bannerTitle}>
                    Rent due on the {dueDay ?? '—'}{dueDay ? ordinal(dueDay) : ''} of each month
                  </Text>
                  <Text style={styles.bannerSub}>
                    First payment starts{' '}
                    <Text style={{ fontWeight: '700', color: C.midnight }}>{nextDue ? fmtDate(nextDue) : '—'}</Text>.
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Months selector */}
          <Text style={styles.sectionTitle}>How many months?</Text>
          <View style={styles.monthsRow}>
            {MONTH_PRESETS.map(n => (
              <TouchableOpacity key={n} style={[styles.monthBtn, monthsCount === n && styles.monthBtnActive]} onPress={() => setMonthsCount(n)}>
                <Text style={[styles.monthBtnText, monthsCount === n && styles.monthBtnTextActive]}>
                  {n === 12 ? '1 yr' : `${n} mo`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {monthsCount >= 3 && noReminderUntil && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                ✓ Covers {monthsCount} months — next rent due {fmtDate(noReminderUntil)}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Payment method</Text>
          {METHODS.map(m => (
            <TouchableOpacity key={m.id} style={[styles.methodCard, method === m.id && styles.methodCardActive]} onPress={() => setMethod(m.id)}>
              <Text style={styles.methodEmoji}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>{m.label}</Text>
                <Text style={styles.methodDesc}>{m.desc}</Text>
              </View>
              {method === m.id && <Text style={{ color: C.crimson, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}

          {method === 'mtn_momo' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>MTN MoMo Instructions</Text>
              {[
                ['Dial', '*156#'],
                ['Select:', '1 → Send Money'],
                ['Select:', '1 → MTN Mobile Money User'],
                ['Enter receiver\'s MTN number below', ''],
                ['Enter amount & PIN:', `L$${Math.round(totalUsd * fxRate).toLocaleString()}`],
              ].map(([label, val], i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,193,7,0.25)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#996600' }}>{i + 1}</Text>
                  </View>
                  <Text style={styles.infoText}>{label}{val ? ' ' : ''}<Text style={val ? styles.mono : {}}>{val}</Text></Text>
                </View>
              ))}
              <View style={styles.momoNumBox}>
                <Text style={styles.mono}>{momoNumber}</Text>
                <Text style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>{momoAccName}</Text>
              </View>
            </View>
          )}
          {method === 'orange_money' && (
            <View style={[styles.infoBox, { backgroundColor: '#FFF3EC' }]}>
              <Text style={styles.infoTitle}>Orange Money Instructions</Text>
              {[
                ['Dial', '*144#'],
                ['Select:', 'Transfer Money'],
                ['Enter receiver\'s Orange number below', ''],
                ['Enter amount & PIN:', `L$${Math.round(totalUsd * fxRate).toLocaleString()}`],
              ].map(([label, val], i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: 'rgba(255,107,0,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#CC4400' }}>{i + 1}</Text>
                  </View>
                  <Text style={styles.infoText}>{label}{val ? ' ' : ''}<Text style={val ? styles.mono : {}}>{val}</Text></Text>
                </View>
              ))}
              {orangeNumber ? (
                <View style={[styles.momoNumBox, { borderColor: 'rgba(255,107,0,0.2)' }]}>
                  <Text style={styles.mono}>{orangeNumber}</Text>
                  <Text style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>{orangeAccName}</Text>
                </View>
              ) : (
                <Text style={[styles.infoText, { marginTop: 6 }]}>Contact the office for the Orange Money number.</Text>
              )}
            </View>
          )}
          {method === 'bank_transfer' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Bank Transfer Details</Text>
              {bankList.length === 0
                ? <Text style={styles.infoText}>Contact the office for bank details.</Text>
                : bankList.map((b, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={styles.infoText}><Text style={styles.mono}>{b.bank}</Text></Text>
                    <Text style={styles.infoText}>Account: <Text style={styles.mono}>{b.account}</Text></Text>
                    {b.name ? <Text style={styles.infoText}>Name: <Text style={styles.mono}>{b.name}</Text></Text> : null}
                  </View>
                ))}
            </View>
          )}

          <TouchableOpacity style={[styles.btn, !method && styles.btnDisabled]} onPress={() => setStep(1)} disabled={!method}>
            <Text style={styles.btnText}>Continue →</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Step 1 — Proof */}
      {step === 1 && (
        <>
          <Text style={styles.sectionTitle}>Upload proof of payment</Text>
          <Text style={styles.stepHint}>A screenshot or photo of your transaction receipt.</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Transaction reference <Text style={{ color: C.stone2 }}>(optional)</Text></Text>
            <TextInput style={styles.input} value={ref} onChangeText={setRef} placeholder="e.g. TXN123456" placeholderTextColor={C.stone} />
          </View>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            {proof
              ? <><Text style={{ fontSize: 20, marginBottom: 4 }}>📎</Text><Text style={styles.uploadText}>{proof.name}</Text><Text style={styles.uploadSub}>Tap to change</Text></>
              : <><Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text><Text style={styles.uploadText}>Tap to upload</Text><Text style={styles.uploadSub}>Photo or screenshot</Text></>
            }
          </TouchableOpacity>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(0)}><Text style={styles.outlineBtnText}>← Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => setStep(2)}><Text style={styles.btnText}>Continue →</Text></TouchableOpacity>
          </View>
        </>
      )}

      {/* Step 2 — Confirm */}
      {step === 2 && (
        <>
          <Text style={styles.sectionTitle}>Review & submit</Text>
          {[
            ['Store',      `${(lease.store as any)?.code} · ${(lease.store as any)?.name}`],
            ['Covers',     coverageLabel],
            ['Amount',     `$${totalUsd.toLocaleString()} (L$${Math.round(totalUsd * fxRate).toLocaleString()})`],
            ...(monthsCount > 1 ? [['Breakdown', `${monthsCount} × $${rent.toLocaleString()}/mo`]] : []),
            ['Method',     method === 'mtn_momo' ? 'MTN MoMo' : method === 'orange_money' ? 'Orange Money' : 'Bank Transfer'],
            ['Ref',        ref || 'Not provided'],
            ['Proof',      proof ? proof.name : 'None uploaded'],
          ].map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewKey}>{k}</Text>
              <Text style={styles.reviewVal}>{v}</Text>
            </View>
          ))}
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(1)}><Text style={styles.outlineBtnText}>← Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { flex: 1 }, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit payment</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.paper },
  content:          { padding: 20, paddingBottom: 40 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header:           { marginBottom: 20 },
  pageTitle:        { fontSize: 24, fontWeight: '700', color: C.midnight },
  pageSub:          { fontSize: 13, color: C.stone, marginTop: 2, marginBottom: 20 },
  steps:            { flexDirection: 'row', gap: 12 },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepDot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stepNum:          { fontSize: 13, fontWeight: '700', color: C.stone },
  stepLabel:        { fontSize: 11, color: C.stone2 },
  amountCard:       { backgroundColor: C.midnight, borderRadius: 16, padding: 20, marginBottom: 24 },
  amountLabel:      { fontSize: 12, color: 'rgba(246,241,228,0.5)', marginBottom: 4 },
  amountUsd:        { fontSize: 30, fontWeight: '700', color: C.cream },
  amountBreakdown:  { fontSize: 12, color: 'rgba(246,241,228,0.55)', marginTop: 2 },
  amountLrd:        { fontSize: 12, color: 'rgba(246,241,228,0.4)', marginTop: 2 },
  // Banner
  banner:           { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1 },
  bannerGreen:      { backgroundColor: '#E8FAF1', borderColor: '#A7E9C4' },
  bannerGrey:       { backgroundColor: '#F9F7F3', borderColor: C.line },
  bannerIcon:       { fontSize: 18, marginTop: 1 },
  bannerTitle:      { fontSize: 13, fontWeight: '700', color: C.mint, marginBottom: 4 },
  bannerSub:        { fontSize: 12, color: C.stone, lineHeight: 18 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: C.midnight, marginBottom: 12 },
  stepHint:         { fontSize: 13, color: C.stone, marginBottom: 16, marginTop: -6 },
  monthsRow:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  monthBtn:         { flex: 1, height: 44, borderRadius: 10, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  monthBtnActive:   { borderColor: C.crimson, backgroundColor: '#FEF2F2' },
  monthBtnText:     { fontSize: 12, fontWeight: '700', color: C.stone },
  monthBtnTextActive: { color: C.crimson },
  savingsBadge:     { backgroundColor: '#E8FAF1', borderRadius: 8, padding: 10, marginBottom: 4 },
  savingsText:      { fontSize: 12, color: C.mint, fontWeight: '500', lineHeight: 17 },
  methodCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: C.line },
  methodCardActive: { borderColor: C.crimson, backgroundColor: '#FEF2F2' },
  methodEmoji:      { fontSize: 24, width: 36, textAlign: 'center' },
  methodLabel:      { fontSize: 15, fontWeight: '600', color: C.midnight },
  methodDesc:       { fontSize: 12, color: C.stone, marginTop: 2 },
  infoBox:          { backgroundColor: '#EEF6FF', borderRadius: 12, padding: 16, marginBottom: 16, marginTop: 4 },
  infoTitle:        { fontSize: 13, fontWeight: '700', color: C.midnight, marginBottom: 8 },
  infoText:         { fontSize: 13, color: C.stone, marginBottom: 4 },
  mono:             { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '600', color: C.midnight },
  momoNumBox:       { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.25)' },
  field:            { marginBottom: 16 },
  label:            { fontSize: 13, fontWeight: '600', color: C.midnight, marginBottom: 6 },
  input:            { height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, fontSize: 15, color: C.midnight, backgroundColor: '#fff' },
  uploadBtn:        { borderWidth: 2, borderColor: C.line, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', backgroundColor: '#fff', marginBottom: 20 },
  uploadText:       { fontSize: 14, fontWeight: '600', color: C.midnight },
  uploadSub:        { fontSize: 12, color: C.stone2, marginTop: 2 },
  rowBtns:          { flexDirection: 'row', gap: 10 },
  btn:              { height: 50, backgroundColor: C.crimson, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:          { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled:      { opacity: 0.4 },
  outlineBtn:       { height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#fff' },
  outlineBtnText:   { fontSize: 14, fontWeight: '600', color: C.stone },
  reviewRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  reviewKey:        { fontSize: 13, color: C.stone },
  reviewVal:        { fontSize: 13, fontWeight: '600', color: C.midnight, maxWidth: '60%', textAlign: 'right' },
  noLease:          { fontSize: 18, fontWeight: '700', color: C.midnight, marginBottom: 8 },
  noLeaseSub:       { fontSize: 14, color: C.stone, marginBottom: 4 },
  doneTitle:        { fontSize: 22, fontWeight: '700', color: C.midnight, marginBottom: 10, textAlign: 'center' },
  doneSub:          { fontSize: 14, color: C.stone, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
})
