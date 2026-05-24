import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useFxRate, toLrd as toLrdFn } from '@/hooks/useFxRate'
import { Lease, Store, Payment } from '@/types'
import Pill from '@/components/ui/Pill'
import Btn from '@/components/ui/Btn'
import Avatar from '@/components/ui/Avatar'
import { IconCash, IconFile, IconWrench, IconClock, IconCheck, IconAlert } from '@/components/ui/Icons'

type TenantLease = Lease & { store: Store }

function useTenantData(userId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-home', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: leaseData }, { data: payments }] = await Promise.all([
        supabase
          .from('leases')
          .select('*, store:stores(*)')
          .eq('tenant_id', userId!)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', userId!)
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      return {
        lease: leaseData as TenantLease | null,
        recentPayments: (payments ?? []) as Payment[],
      }
    },
    staleTime: 30_000,
  })
}

function dueStatus(lease: TenantLease, payments: Payment[]) {
  const today    = new Date()
  const thisMonth = format(today, 'yyyy-MM')
  const paid = payments.find(p => p.period_month === thisMonth && (p.status === 'confirmed' || p.status === 'pending'))
  if (paid) return { label: paid.status === 'confirmed' ? 'Paid' : 'Pending', tone: paid.status === 'confirmed' ? 'mint' : 'gold', daysMsg: '' }
  const dayOfMonth = today.getDate()
  const daysLeft   = 5 - dayOfMonth
  if (daysLeft >= 0) return { label: 'Due Soon', tone: 'gold', daysMsg: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` }
  return { label: 'Overdue', tone: 'crimson', daysMsg: `${Math.abs(daysLeft)} days late` }
}

export default function TenantHome() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const { data: fxRate = 180 } = useFxRate()
  const toLrd = (usd: number) => toLrdFn(usd, fxRate)
  const { data, isLoading } = useTenantData(profile?.id)

  const { lease, recentPayments = [] } = data ?? {}

  const due = lease ? dueStatus(lease, recentPayments) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: 24 }}>
      {/* Greeting header */}
      <div style={{ background: 'var(--gr-midnight)', padding: '28px 20px 32px', position: 'relative', overflow: 'hidden' }}>
        <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Avatar name={profile?.full_name ?? '?'} size={40} />
            <div>
              <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.55)' }}>Good day,</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gr-cream)' }}>{profile?.full_name}</div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ height: 100 }} />
          ) : lease ? (
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.1)', padding: '18px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', marginBottom: 6 }}>Monthly Rent</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700, color: '#fff' }}>
                    ${lease.monthly_rent_usd.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.45)', marginTop: 2 }}>
                    L${toLrd(lease.monthly_rent_usd).toLocaleString()}
                  </div>
                </div>
                {due && (
                  <div style={{ textAlign: 'right' }}>
                    <Pill tone={due.tone as any}>{due.label}</Pill>
                    {due.daysMsg && <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', marginTop: 6 }}>{due.daysMsg}</div>}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(246,241,228,0.4)' }}>Store</div>
                  <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.8)', fontWeight: 600, marginTop: 2 }}>{lease.store.code} · {lease.store.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(246,241,228,0.4)' }}>Business</div>
                  <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.8)', fontWeight: 600, marginTop: 2 }}>{lease.business_name}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: 'rgba(246,241,228,0.55)' }}>No active lease found.</div>
              <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.35)', marginTop: 4 }}>Contact your landlord for assistance.</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { icon: <IconCash size={20} stroke="var(--gr-crimson)" />, label: 'Pay Rent', path: '/tenant/pay' },
            { icon: <IconFile size={20} stroke="var(--gr-navy)" />, label: 'Receipts', path: '/tenant/receipts' },
            { icon: <IconWrench size={20} stroke="var(--gr-gold)" />, label: 'Maintenance', path: '/tenant/maintenance' },
          ].map(a => (
            <motion.button
              key={a.path}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(a.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 8px', borderRadius: 14, border: '1px solid var(--gr-line)',
                background: '#fff', cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
            >
              {a.icon}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gr-ink)' }}>{a.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent payments */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Payments</div>
          <button onClick={() => navigate('/tenant/receipts')} style={{ fontSize: 12, color: 'var(--gr-crimson)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            See all →
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--gr-stone-2)' }}>
            No payments yet. Pay your first month's rent to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPayments.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid var(--gr-line)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: p.status === 'confirmed' ? 'rgba(47,184,117,0.1)' : p.status === 'pending' ? 'rgba(233,185,73,0.1)' : 'rgba(209,31,44,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {p.status === 'confirmed' ? <IconCheck size={16} stroke="var(--gr-mint)" />
                      : p.status === 'pending'  ? <IconClock size={16} stroke="var(--gr-gold)" />
                      : <IconAlert size={16} stroke="var(--gr-crimson)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>
                      {p.period_month ? format(parseISO(p.period_month + '-01'), 'MMMM yyyy') : 'Payment'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>
                      {format(parseISO(p.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>${p.amount_usd.toLocaleString()}</div>
                  <Pill tone={p.status === 'confirmed' ? 'mint' : p.status === 'pending' ? 'gold' : 'crimson'} style={{ fontSize: 10, marginTop: 3 }}>
                    {p.status}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
