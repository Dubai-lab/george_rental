import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type EnqStatus = 'new' | 'read' | 'contacted'

interface Enquiry {
  id:         string
  store_id:   string
  name:       string
  email:      string | null
  phone:      string | null
  message:    string | null
  status:     EnqStatus
  created_at: string
  store?:     { code: string; name: string; rent_usd: number } | null
}

type Filter = 'all' | 'new' | 'contacted'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function statusPill(s: EnqStatus) {
  if (s === 'new')       return { label: 'New',       bg: '#D11F2C22', color: '#D11F2C' }
  if (s === 'contacted') return { label: 'Contacted', bg: '#2FB87522', color: '#2FB875' }
  return { label: 'Read', bg: 'rgba(11,26,61,0.08)', color: 'var(--gr-stone)' }
}

export default function Enquiries() {
  const [filter,   setFilter]   = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: enquiries = [], isLoading } = useQuery<Enquiry[]>({
    queryKey: ['enquiries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_enquiries')
        .select('*, store:stores(code, name, rent_usd)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Enquiry[]
    },
    staleTime: 30_000,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EnqStatus }) => {
      const { error } = await supabase
        .from('store_enquiries')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enquiries'] }),
  })

  const filtered = enquiries.filter(e =>
    filter === 'all' ? true : e.status === filter
  )

  const counts = {
    all:       enquiries.length,
    new:       enquiries.filter(e => e.status === 'new').length,
    contacted: enquiries.filter(e => e.status === 'contacted').length,
  }

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total enquiries', value: enquiries.length,            color: 'var(--gr-ink)' },
          { label: 'New / unread',    value: counts.new,                  color: 'var(--gr-crimson)' },
          { label: 'Contacted',       value: counts.contacted,            color: 'var(--gr-mint)' },
          { label: 'Stores enquired', value: new Set(enquiries.map(e => e.store_id)).size, color: 'var(--gr-navy)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid var(--gr-line)' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'var(--f-display)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          { id: 'all' as Filter,       label: `All (${counts.all})` },
          { id: 'new' as Filter,       label: `New (${counts.new})` },
          { id: 'contacted' as Filter, label: `Contacted (${counts.contacted})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: '7px 16px', borderRadius: 20,
            background: filter === t.id ? 'var(--gr-midnight)' : '#fff',
            color:      filter === t.id ? 'var(--gr-cream)' : 'var(--gr-stone-2)',
            border: filter === t.id ? 'none' : '1px solid var(--gr-line)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--gr-stone-2)' }}>Loading enquiries…</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gr-ink)', marginBottom: 6 }}>
            {filter === 'new' ? 'No new enquiries' : 'No enquiries yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>
            Enquiries submitted from the public store listing will appear here.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(enq => {
          const pill    = statusPill(enq.status)
          const isOpen  = expanded === enq.id

          return (
            <motion.div
              key={enq.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#fff', borderRadius: 14,
                border: `1px solid ${enq.status === 'new' ? 'rgba(209,31,44,0.2)' : 'var(--gr-line)'}`,
                overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <div
                onClick={() => {
                  setExpanded(isOpen ? null : enq.id)
                  if (enq.status === 'new') updateStatus.mutate({ id: enq.id, status: 'read' })
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px 160px 130px 36px',
                  gap: 12,
                  padding: '14px 18px',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {/* Name + store */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>{enq.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>
                    {enq.store ? `${enq.store.code} · ${enq.store.name}` : 'Unknown store'}
                  </div>
                </div>

                {/* Contact info */}
                <div style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>
                  {enq.email && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉️ {enq.email}</div>}
                  {enq.phone && <div style={{ marginTop: 2 }}>📞 {enq.phone}</div>}
                  {!enq.email && !enq.phone && <span style={{ fontStyle: 'italic' }}>No contact info</span>}
                </div>

                {/* Date */}
                <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>{fmtDate(enq.created_at)}</div>

                {/* Status */}
                <div>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: pill.bg, color: pill.color }}>
                    {pill.label}
                  </span>
                </div>

                {/* Expand chevron */}
                <div style={{ fontSize: 16, color: 'var(--gr-stone-2)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', textAlign: 'center' }}>
                  ›
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ borderTop: '1px solid var(--gr-line-2)', padding: '16px 18px 18px' }}
                >
                  {enq.message && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Message
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--gr-ink)', lineHeight: 1.6, background: 'var(--gr-paper)', borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap' }}>
                        {enq.message}
                      </div>
                    </div>
                  )}

                  {/* Store detail */}
                  {enq.store && (
                    <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--gr-paper)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--gr-stone-2)', marginRight: 8 }}>{enq.store.code}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{enq.store.name}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', fontVariantNumeric: 'tabular-nums' }}>
                        ${enq.store.rent_usd.toLocaleString()}/mo
                      </span>
                    </div>
                  )}

                  {/* Contact buttons + status actions */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {enq.email && (
                      <a href={`mailto:${enq.email}?subject=Re: Enquiry about ${enq.store?.name ?? 'store'}&body=Hi ${enq.name},%0D%0A%0D%0AThank you for your enquiry about ${enq.store?.name ?? 'our store'}.`}
                        style={actionBtn('#0B1A3D', '#fff')}>
                        ✉️ Reply by email
                      </a>
                    )}
                    {enq.phone && (
                      <a href={`tel:${enq.phone.replace(/\s/g, '')}`} style={actionBtn('var(--gr-paper)', 'var(--gr-ink)', '1px solid var(--gr-line)')}>
                        📞 Call {enq.phone}
                      </a>
                    )}
                    {enq.status !== 'contacted' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: enq.id, status: 'contacted' })}
                        disabled={updateStatus.isPending}
                        style={actionBtn('var(--gr-mint)', '#fff')}
                      >
                        ✓ Mark as contacted
                      </button>
                    )}
                    {enq.status === 'contacted' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: enq.id, status: 'new' })}
                        disabled={updateStatus.isPending}
                        style={actionBtn('var(--gr-paper)', 'var(--gr-stone-2)', '1px solid var(--gr-line)')}
                      >
                        ↩ Reopen
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function actionBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 36, padding: '0 14px', borderRadius: 8,
    background: bg, color, border: border ?? 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
  }
}
