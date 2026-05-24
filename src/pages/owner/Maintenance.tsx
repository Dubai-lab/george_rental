import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { MaintenanceRequest, Profile, Store, Lease } from '@/types'
import Pill from '@/components/ui/Pill'
import Btn from '@/components/ui/Btn'
import Avatar from '@/components/ui/Avatar'
import { IconSearch, IconClose, IconWrench, IconClock } from '@/components/ui/Icons'

type MRow = MaintenanceRequest & {
  tenant: Pick<Profile, 'full_name' | 'email'>
  store:  Pick<Store, 'code' | 'name'>
}

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved'

function useMaintenance(status: FilterStatus) {
  return useQuery<MRow[]>({
    queryKey: ['maintenance', status],
    queryFn: async () => {
      let q = supabase
        .from('maintenance_requests')
        .select(`
          *,
          tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email),
          store:stores(code, name)
        `)
        .order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as MRow[]
    },
    staleTime: 20_000,
  })
}

function statusTone(s: string): any {
  if (s === 'resolved') return 'mint'
  if (s === 'in_progress') return 'gold'
  return 'crimson'
}

function priorityTone(p: string): any {
  if (p === 'high') return 'crimson'
  if (p === 'medium') return 'gold'
  return 'gray'
}

const nextStatus: Record<string, MaintenanceRequest['status']> = {
  open:        'in_progress',
  in_progress: 'resolved',
}

export default function Maintenance() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<MRow | null>(null)

  const { data: requests = [], isLoading } = useMaintenance(filter)

  const filtered = requests.filter(r =>
    !q ||
    r.title.toLowerCase().includes(q.toLowerCase()) ||
    r.tenant?.full_name.toLowerCase().includes(q.toLowerCase()) ||
    r.store?.name.toLowerCase().includes(q.toLowerCase())
  )

  const openCount = requests.filter(r => r.status === 'open').length
  const inProgCount = requests.filter(r => r.status === 'in_progress').length

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceRequest['status'] }) => {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      setSelected(null)
    },
  })

  const tabs: { label: string; value: FilterStatus; count?: number }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open', count: openCount },
    { label: 'In Progress', value: 'in_progress', count: inProgCount },
    { label: 'Resolved', value: 'resolved' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, color: 'var(--gr-ink)' }}>Maintenance</div>
        <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 4 }}>
          {openCount} open · {inProgCount} in progress
        </div>
      </div>

      {/* Tabs + search */}
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
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                  background: 'var(--gr-crimson)', color: '#fff',
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto', minWidth: 240 }}>
          <IconSearch size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gr-stone-2)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search requests…"
            style={{
              width: '100%', height: 38, paddingLeft: 36, paddingRight: 14,
              borderRadius: 10, border: '1px solid var(--gr-line)',
              background: '#fff', fontSize: 13, color: 'var(--gr-ink)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No maintenance requests</div>
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>Requests submitted by tenants appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(r)}
              style={{
                background: '#fff', borderRadius: 14, border: '1px solid var(--gr-line)',
                padding: '18px 20px', cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                borderLeft: `3px solid ${r.status === 'open' ? 'var(--gr-crimson)' : r.status === 'in_progress' ? 'var(--gr-gold)' : 'var(--gr-mint)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', lineHeight: 1.3, flex: 1, paddingRight: 10 }}>{r.title}</div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Pill tone={priorityTone(r.priority)} style={{ fontSize: 10 }}>{r.priority}</Pill>
                  <Pill tone={statusTone(r.status)} style={{ fontSize: 10 }}>{r.status.replace('_', ' ')}</Pill>
                </div>
              </div>
              {r.description && (
                <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', lineHeight: 1.5, marginBottom: 12,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {r.description}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={r.tenant?.full_name ?? '?'} size={24} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gr-ink)' }}>{r.tenant?.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>{r.store?.code} · {r.store?.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--gr-stone-2)' }}>
                  <IconClock size={12} />
                  {format(parseISO(r.created_at), 'dd MMM')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
                background: '#fff', zIndex: 201,
                boxShadow: '-24px 0 80px rgba(6,9,20,0.18)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ background: 'var(--gr-midnight)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Maintenance Request</div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(246,241,228,0.6)', padding: 0 }}>
                    <IconClose size={20} />
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, color: 'var(--gr-cream)', lineHeight: 1.3, marginBottom: 12 }}>
                  {selected.title}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Pill tone={priorityTone(selected.priority)}>{selected.priority} priority</Pill>
                  <Pill tone={statusTone(selected.status)}>{selected.status.replace('_', ' ')}</Pill>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                {selected.description && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Description</div>
                    <div style={{ fontSize: 13, color: 'var(--gr-ink)', lineHeight: 1.6 }}>{selected.description}</div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <DrawerRow label="Submitted by" value={selected.tenant?.full_name ?? '—'} />
                  <DrawerRow label="Store" value={`${selected.store?.code} · ${selected.store?.name}`} />
                  <DrawerRow label="Submitted" value={format(parseISO(selected.created_at), 'dd MMM yyyy, HH:mm')} />
                  {selected.updated_at !== selected.created_at && (
                    <DrawerRow label="Updated" value={format(parseISO(selected.updated_at), 'dd MMM yyyy, HH:mm')} />
                  )}
                </div>

                {/* Status actions */}
                {selected.status !== 'resolved' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Update Status</div>
                    <Btn
                      kind="crimson"
                      loading={updateMut.isPending}
                      icon={<IconWrench size={15} stroke="#fff" />}
                      style={{ width: '100%' }}
                      onClick={() => updateMut.mutate({ id: selected.id, status: nextStatus[selected.status] })}
                    >
                      {selected.status === 'open' ? 'Mark as In Progress' : 'Mark as Resolved'}
                    </Btn>
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

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 110, fontSize: 12, color: 'var(--gr-stone-2)', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--gr-ink)' }}>{value}</div>
    </div>
  )
}
