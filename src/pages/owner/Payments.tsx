import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Payment, Lease, Store, Profile } from '@/types'
import Pill from '@/components/ui/Pill'
import Btn from '@/components/ui/Btn'
import Avatar from '@/components/ui/Avatar'
import { IconSearch, IconCheck, IconClose, IconFile, IconDownload, IconPrinter } from '@/components/ui/Icons'

type PaymentRow = Payment & {
  lease: Lease & { store: Pick<Store, 'code' | 'name'> }
  tenant: Pick<Profile, 'full_name' | 'email'>
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected'

function usePayments(status: FilterStatus) {
  return useQuery<PaymentRow[]>({
    queryKey: ['payments', status],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select(`
          *,
          lease:leases(*, store:stores(code, name)),
          tenant:profiles!payments_tenant_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as PaymentRow[]
    },
    staleTime: 15_000,
  })
}

function methodLabel(m: string) {
  if (m === 'mtn_momo') return 'MTN MoMo'
  if (m === 'bank_transfer') return 'Bank Transfer'
  return 'Cash'
}

function statusTone(s: string): any {
  if (s === 'confirmed') return 'mint'
  if (s === 'rejected') return 'crimson'
  return 'gold'
}

export default function Payments() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<PaymentRow | null>(null)
  const [notes, setNotes] = useState('')

  const { data: payments = [], isLoading } = usePayments(filter)

  const filtered = payments.filter(p =>
    !q ||
    p.tenant?.full_name.toLowerCase().includes(q.toLowerCase()) ||
    p.lease?.store?.code.toLowerCase().includes(q.toLowerCase()) ||
    (p.transaction_ref ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const confirmMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'confirmed' | 'rejected' }) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: action, confirmed_at: new Date().toISOString(), confirmed_by: profile?.id, notes: notes || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setSelected(null)
      setNotes('')
    },
  })

  const tabs: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Rejected', value: 'rejected' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, color: 'var(--gr-ink)' }}>Payments</div>
        <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 4 }}>
          {payments.filter(p => p.status === 'pending').length} pending review
        </div>
      </div>

      {/* Filter tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--gr-paper)', borderRadius: 10, padding: 4 }}>
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: filter === t.value ? '#fff' : 'transparent',
                color: filter === t.value ? 'var(--gr-ink)' : 'var(--gr-stone-2)',
                boxShadow: filter === t.value ? '0 1px 4px rgba(6,9,20,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto', minWidth: 240 }}>
          <IconSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gr-stone-2)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search payments…"
            style={{
              width: '100%', height: 38, paddingLeft: 36, paddingRight: 14,
              borderRadius: 10, border: '1px solid var(--gr-line)',
              background: '#fff', fontSize: 13, color: 'var(--gr-ink)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 120px 80px',
          padding: '12px 20px', borderBottom: '1px solid var(--gr-line)',
          fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          <span>Tenant / Store</span>
          <span>Amount</span>
          <span>Method</span>
          <span>Period</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No payments found</div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>Payments will appear here once tenants submit them.</div>
          </div>
        ) : filtered.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 120px 80px',
              padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--gr-line)' : 'none',
              alignItems: 'center', cursor: 'pointer',
              background: p.status === 'pending' ? 'rgba(233,185,73,0.03)' : undefined,
            }}
            onClick={() => { setSelected(p); setNotes('') }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={p.tenant?.full_name ?? '?'} size={32} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{p.tenant?.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 1 }}>
                  {p.lease?.store?.code} · {format(parseISO(p.created_at), 'dd MMM yyyy')}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-ink)' }}>${p.amount_usd.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>L${(p.amount_lrd ?? 0).toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>{methodLabel(p.method)}</div>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', fontFamily: 'var(--f-mono)' }}>
              {p.period_month ? format(parseISO(p.period_month + '-01'), 'MMM yy') : '—'}
            </div>
            <div><Pill tone={statusTone(p.status)}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Pill></div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--gr-crimson)', fontWeight: 500 }}>
              {p.status === 'pending' ? 'Review →' : 'View →'}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,20,0.45)', zIndex: 200 }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
                background: '#fff', zIndex: 201,
                boxShadow: '-24px 0 80px rgba(6,9,20,0.18)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ background: 'var(--gr-midnight)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payment Detail</div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(246,241,228,0.6)', padding: 0 }}>
                    <IconClose size={20} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                      ${selected.amount_usd.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(246,241,228,0.55)', marginTop: 2 }}>
                      L${(selected.amount_lrd ?? 0).toLocaleString()} · Rate L${selected.fx_rate}/$1
                    </div>
                  </div>
                  <Pill tone={statusTone(selected.status)}>
                    {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </Pill>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <DrawerRow label="Tenant" value={selected.tenant?.full_name ?? '—'} />
                  <DrawerRow label="Store" value={`${selected.lease?.store?.code} · ${selected.lease?.store?.name}`} />
                  <DrawerRow label="Period" value={selected.period_month ? format(parseISO(selected.period_month + '-01'), 'MMMM yyyy') : '—'} />
                  <DrawerRow label="Method" value={methodLabel(selected.method)} />
                  <DrawerRow label="Transaction Ref" value={selected.transaction_ref ?? 'Not provided'} mono />
                  <DrawerRow label="Submitted" value={format(parseISO(selected.created_at), 'dd MMM yyyy, HH:mm')} />
                  {selected.receipt_number && <DrawerRow label="Receipt #" value={selected.receipt_number} mono />}
                  {selected.confirmed_at && <DrawerRow label="Confirmed" value={format(parseISO(selected.confirmed_at), 'dd MMM yyyy, HH:mm')} />}
                  {selected.notes && <DrawerRow label="Notes" value={selected.notes} />}
                </div>

                {/* Proof */}
                {selected.proof_url && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Payment Proof</div>
                    <a href={selected.proof_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        borderRadius: 10, border: '1px solid var(--gr-line)', textDecoration: 'none',
                        color: 'var(--gr-ink)', fontSize: 13, fontWeight: 500,
                        transition: 'background 0.15s',
                      }}
                    >
                      <IconFile size={16} style={{ color: 'var(--gr-crimson)' }} />
                      View uploaded proof
                      <IconDownload size={14} style={{ marginLeft: 'auto', color: 'var(--gr-stone-2)' }} />
                    </a>
                  </div>
                )}

                {/* Confirm/reject actions */}
                {selected.status === 'pending' && (
                  <div style={{ marginTop: 28 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Review Action</div>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Optional note (visible on receipt)…"
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10,
                        border: '1px solid var(--gr-line)', fontSize: 13, color: 'var(--gr-ink)',
                        resize: 'vertical', outline: 'none', fontFamily: 'var(--f-body)', marginBottom: 14,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Btn
                        kind="crimson" style={{ flex: 1 }}
                        loading={confirmMut.isPending}
                        icon={<IconCheck size={15} stroke="#fff" />}
                        onClick={() => confirmMut.mutate({ id: selected.id, action: 'confirmed' })}
                      >
                        Confirm payment
                      </Btn>
                      <Btn
                        kind="ghost" style={{ flex: 1 }}
                        loading={confirmMut.isPending}
                        icon={<IconClose size={15} />}
                        onClick={() => confirmMut.mutate({ id: selected.id, action: 'rejected' })}
                      >
                        Reject
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function DrawerRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 120, fontSize: 12, color: 'var(--gr-stone-2)', fontWeight: 500, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--gr-ink)', fontFamily: mono ? 'var(--f-mono)' : undefined, flex: 1 }}>{value}</div>
    </div>
  )
}
