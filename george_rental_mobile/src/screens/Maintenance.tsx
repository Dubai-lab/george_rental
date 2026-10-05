import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Profile, MaintenanceRequest, Lease } from '../types'

const C = {
  midnight: '#060914',
  crimson:  '#D11F2C',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  stone2:   '#9E9893',
  line:     '#E5E0D5',
  mint:     '#2FB875',
}

const PRIORITIES = [
  { id: 'low',    label: 'Low',    color: '#6B6560' },
  { id: 'medium', label: 'Medium', color: '#C89A30' },
  { id: 'high',   label: 'High',   color: '#D11F2C' },
]

function statusStyle(s: string) {
  if (s === 'resolved')   return { bg: C.mint + '20',    color: C.mint }
  if (s === 'in_progress') return { bg: '#E9B94920',       color: '#C89A30' }
  return { bg: '#6B656020', color: '#6B6560' }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props { profile: Profile }

export default function Maintenance({ profile }: Props) {
  const { width } = useWindowDimensions()
  const isTablet = width >= 600
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [lease,    setLease]    = useState<Lease | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [refresh,  setRefresh]  = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [title,    setTitle]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const { data: leaseData } = await supabase
      .from('leases')
      .select('*, store:stores(code, name)')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()
    setLease(leaseData)

    if (leaseData) {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*, store:stores(code, name)')
        .eq('tenant_id', profile.id)
        .order('created_at', { ascending: false })
      setRequests(data ?? [])
    }
    setLoading(false)
    setRefresh(false)
  }

  useFocusEffect(useCallback(() => { load() }, []))
  function onRefresh() { setRefresh(true); load() }

  async function submit() {
    if (!lease) return
    if (!title.trim()) { Alert.alert('Missing title', 'Please enter a short title.'); return }
    setSubmitting(true)
    const { data: created, error } = await supabase.from('maintenance_requests').insert({
      lease_id:    lease.id,
      tenant_id:   profile.id,
      store_id:    lease.store_id,
      title:       title.trim(),
      description: desc.trim() || null,
      priority,
      status:      'open',
    }).select('id').single()
    setSubmitting(false)
    if (error) { Alert.alert('Error', error.message); return }
    // Email the office — non-blocking
    if (created?.id) {
      supabase.functions.invoke('notify-maintenance', { body: { request_id: created.id, event: 'created' } }).catch(() => {})
    }
    setTitle(''); setDesc(''); setPriority('medium')
    setShowForm(false)
    load()
    Alert.alert('Submitted!', 'Your maintenance request has been sent.')
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={C.crimson} size="large" /></View>
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={onRefresh} tintColor={C.crimson} />}
      >
        <View style={isTablet ? { maxWidth: 600, width: '100%', alignSelf: 'center' } : {}}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Maintenance</Text>
          {lease && (
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(v => !v)}>
              <Text style={styles.newBtnText}>{showForm ? '✕ Cancel' : '+ New request'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* New request form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Request</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Broken window, No water"
                placeholderTextColor={C.stone}
                maxLength={120}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description <Text style={{ color: C.stone2 }}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={desc}
                onChangeText={setDesc}
                placeholder="Describe the issue in detail…"
                placeholderTextColor={C.stone}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.priorityBtn,
                      priority === p.id && { backgroundColor: p.color, borderColor: p.color },
                    ]}
                    onPress={() => setPriority(p.id as any)}
                  >
                    <Text style={[styles.priorityBtnText, priority === p.id && { color: '#fff' }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, submitting && { opacity: 0.7 }]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Submit request</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Requests list */}
        {!lease && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>🔧</Text>
            <Text style={styles.emptyTitle}>No active lease</Text>
            <Text style={styles.emptySub}>Contact the office to get set up.</Text>
          </View>
        )}

        {lease && requests.length === 0 && !showForm && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySub}>Tap "+ New request" if you need maintenance.</Text>
          </View>
        )}

        {requests.map(r => {
          const ss = statusStyle(r.status)
          const pColor = PRIORITIES.find(p => p.id === r.priority)?.color ?? C.stone
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.reqTitle}>{r.title}</Text>
                  <Text style={styles.reqDate}>{fmtDate(r.created_at)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.pill, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.pillText, { color: ss.color }]}>
                      {r.status === 'in_progress' ? 'In Progress' : r.status === 'resolved' ? 'Resolved' : 'Open'}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pColor + '20' }]}>
                    <Text style={[styles.pillText, { color: pColor }]}>{r.priority}</Text>
                  </View>
                </View>
              </View>
              {r.description ? (
                <Text style={styles.reqDesc}>{r.description}</Text>
              ) : null}
            </View>
          )
        })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.paper },
  content:       { padding: 20, paddingBottom: 40 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle:     { fontSize: 24, fontWeight: '700', color: C.midnight },
  newBtn:        {
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.crimson,
    borderRadius: 10,
  },
  newBtnText:    { fontSize: 13, fontWeight: '600', color: '#fff' },
  formCard:      {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 20, borderWidth: 1, borderColor: C.line,
  },
  formTitle:     { fontSize: 16, fontWeight: '700', color: C.midnight, marginBottom: 16 },
  field:         { marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', color: C.midnight, marginBottom: 6 },
  input:         {
    borderRadius: 10, borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 14, fontSize: 15, color: C.midnight,
    backgroundColor: C.paper, height: 48,
  },
  textarea:      { height: 100, paddingTop: 12 },
  priorityRow:   { flexDirection: 'row', gap: 8 },
  priorityBtn:   {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.line, alignItems: 'center',
  },
  priorityBtnText: { fontSize: 13, fontWeight: '600', color: C.stone },
  btn:           {
    height: 50, backgroundColor: C.crimson, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyBox:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.midnight },
  emptySub:      { fontSize: 14, color: C.stone, textAlign: 'center' },
  card:          {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: C.line,
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqTitle:      { fontSize: 15, fontWeight: '700', color: C.midnight },
  reqDate:       { fontSize: 12, color: C.stone2, marginTop: 2 },
  reqDesc:       { fontSize: 13, color: C.stone, lineHeight: 20 },
  pill:          { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  pillText:      { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
})
