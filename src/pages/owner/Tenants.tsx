import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Profile, Store, Lease } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Pill from '@/components/ui/Pill'
import Btn from '@/components/ui/Btn'
import { IconSearch, IconUserPlus, IconPhone, IconMail, IconStore, IconClose, IconCheck } from '@/components/ui/Icons'
import InviteTenantModal from '@/components/modals/InviteTenantModal'

type TenantRow = Profile & {
  lease: (Lease & { store: Pick<Store, 'code' | 'name' | 'address'> }) | null
}

function useTenants() {
  return useQuery<TenantRow[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          lease:leases(
            *,
            store:stores(code, name, address)
          )
        `)
        .eq('role', 'tenant')
        .order('full_name')
      if (error) throw error
      return (data ?? []).map((p: any) => ({
        ...p,
        lease: Array.isArray(p.lease) ? (p.lease.find((l: Lease) => l.status === 'active') ?? p.lease[0] ?? null) : p.lease,
      }))
    },
    staleTime: 30_000,
  })
}

export default function Tenants() {
  const qc = useQueryClient()
  const { data: tenants = [], isLoading } = useTenants()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<TenantRow | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = tenants.filter(t =>
    !q || t.full_name.toLowerCase().includes(q.toLowerCase()) ||
    (t.email ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (t.lease?.store?.name ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const active  = tenants.filter(t => t.lease?.status === 'active').length
  const noLease = tenants.filter(t => !t.lease).length

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, color: 'var(--gr-ink)' }}>Tenants</div>
          <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 4 }}>
            {tenants.length} total · {active} active · {noLease} no lease
          </div>
        </div>
        <Btn kind="crimson" icon={<IconUserPlus size={16} stroke="#fff" />} onClick={() => setInviteOpen(true)}>
          Invite tenant
        </Btn>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 24 }}>
        <IconSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gr-stone-2)' }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search tenants…"
          style={{
            width: '100%', height: 40, paddingLeft: 40, paddingRight: 14,
            borderRadius: 10, border: '1px solid var(--gr-line)',
            background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 200px 160px 120px 80px',
          padding: '12px 20px', borderBottom: '1px solid var(--gr-line)',
          fontSize: 12, fontWeight: 600, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <span>Tenant</span>
          <span>Store</span>
          <span>Business</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No tenants found</div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>Invite someone to get started.</div>
          </div>
        ) : filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 200px 160px 120px 80px',
              padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--gr-line)' : 'none',
              alignItems: 'center', cursor: 'pointer',
            }}
            onClick={() => setSelected(t)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={t.full_name} size={36} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gr-ink)' }}>{t.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{t.email}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--gr-ink)' }}>
              {t.lease?.store ? (
                <span>
                  <span style={{ fontWeight: 600 }}>{t.lease.store.code}</span>
                  <span style={{ color: 'var(--gr-stone-2)', marginLeft: 4 }}>· {t.lease.store.name}</span>
                </span>
              ) : (
                <span style={{ color: 'var(--gr-stone-2)' }}>—</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>
              {t.lease?.business_name ?? '—'}
            </div>
            <div>
              {t.lease?.status === 'active'
                ? <Pill tone="mint">Active</Pill>
                : t.lease
                  ? <Pill tone="gray">Ended</Pill>
                  : <Pill tone="navy">No lease</Pill>
              }
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--gr-crimson)', fontWeight: 500 }}>
              View →
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
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
                background: '#fff', zIndex: 201, boxShadow: '-24px 0 80px rgba(6,9,20,0.18)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              {/* Drawer header */}
              <div style={{ background: 'var(--gr-midnight)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tenant Detail</div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(246,241,228,0.6)', padding: 0 }}>
                    <IconClose size={20} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar name={selected.full_name} size={56} />
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-cream)' }}>{selected.full_name}</div>
                    {selected.lease?.status === 'active'
                      ? <Pill tone="mint" style={{ marginTop: 6 }}>Active tenant</Pill>
                      : <Pill tone="gray" style={{ marginTop: 6 }}>No active lease</Pill>
                    }
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                {/* Contact */}
                <Section title="Contact">
                  <InfoRow icon={<IconMail size={15} />} label="Email" value={selected.email ?? '—'} />
                  <InfoRow icon={<IconPhone size={15} />} label="Phone" value={selected.phone ?? 'Not provided'} />
                </Section>

                {/* Lease */}
                {selected.lease && (
                  <Section title="Current Lease">
                    <InfoRow icon={<IconStore size={15} />} label="Store" value={`${selected.lease.store?.code ?? ''} · ${selected.lease.store?.name ?? ''}`} />
                    <InfoRow label="Business" value={selected.lease.business_name ?? '—'} />
                    <InfoRow label="Type" value={selected.lease.business_type ?? '—'} />
                    <InfoRow label="Monthly Rent" value={`$${selected.lease.monthly_rent_usd.toLocaleString()}`} />
                    <InfoRow label="Lease Code" value={selected.lease.lease_code ?? '—'} mono />
                    <InfoRow
                      label="Period"
                      value={`${new Date(selected.lease.start_date).toLocaleDateString()} — ${selected.lease.end_date ? new Date(selected.lease.end_date).toLocaleDateString() : 'Open-ended'}`}
                    />
                  </Section>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {inviteOpen && (
        <InviteTenantModal onClose={() => setInviteOpen(false)} onSuccess={() => { setInviteOpen(false); qc.invalidateQueries({ queryKey: ['tenants'] }) }} />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: { icon?: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {icon && <span style={{ color: 'var(--gr-stone-2)', marginTop: 1, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--gr-ink)', fontFamily: mono ? 'var(--f-mono)' : undefined }}>{value}</div>
      </div>
    </div>
  )
}
