import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useFxRate } from '@/hooks/useFxRate'
import { useAuth } from '@/contexts/AuthContext'
import Avatar from '@/components/ui/Avatar'
import Pill from '@/components/ui/Pill'
import { Payment } from '@/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const { data: fxRate = 180 } = useFxRate()
  const qc = useQueryClient()
  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  })()

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
        qc.invalidateQueries({ queryKey: ['recent-activity'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_requests' }, () => {
        qc.invalidateQueries({ queryKey: ['maintenance-open'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  // ── Stats query ───────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const [{ data: confirmed }, { data: leases }, { data: stores }, { data: overdue }] = await Promise.all([
        supabase.from('payments').select('amount_usd, amount_lrd').eq('status', 'confirmed').eq('period_month', monthStart),
        supabase.from('leases').select('monthly_rent_usd').eq('status', 'active'),
        supabase.from('stores').select('status'),
        supabase.from('payments').select('amount_usd').eq('period_month', monthStart).in('status', ['pending', 'rejected']),
      ])
      const collectedUsd  = confirmed?.reduce((s, p) => s + p.amount_usd, 0) ?? 0
      const collectedLrd  = confirmed?.reduce((s, p) => s + (p.amount_lrd ?? 0), 0) ?? 0
      const expectedUsd   = leases?.reduce((s, l) => s + l.monthly_rent_usd, 0) ?? 0
      const totalStores   = stores?.length ?? 0
      const occupiedStores = stores?.filter(s => s.status === 'occupied').length ?? 0
      const overdueAmt    = overdue?.reduce((s, p) => s + p.amount_usd, 0) ?? 0
      return { collectedUsd, collectedLrd, expectedUsd, totalStores, occupiedStores, overdueCount: overdue?.length ?? 0, overdueAmountUsd: overdueAmt }
    },
    staleTime: 30_000,
  })

  // ── Income chart (6 months) ────────────────────────────────
  const { data: chartData } = useQuery({
    queryKey: ['income-chart'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
      const results = await Promise.all(months.map(async m => {
        const start = format(startOfMonth(m), 'yyyy-MM-dd')
        const [{ data: col }, { data: lea }] = await Promise.all([
          supabase.from('payments').select('amount_usd').eq('status', 'confirmed').eq('period_month', start),
          supabase.from('leases').select('monthly_rent_usd').eq('status', 'active'),
        ])
        return {
          label:     format(m, 'MMM'),
          collected: col?.reduce((s, p) => s + p.amount_usd, 0) ?? 0,
          expected:  lea?.reduce((s, l) => s + l.monthly_rent_usd, 0) ?? 0,
        }
      }))
      return results
    },
    staleTime: 60_000,
  })

  // ── Recent activity ────────────────────────────────────────
  const { data: activity = [] } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, tenant:profiles(full_name), store:stores(name)')
        .order('created_at', { ascending: false })
        .limit(6)
      return (data ?? []) as (Payment & { tenant: { full_name: string }; store: { name: string } })[]
    },
    staleTime: 30_000,
  })

  const collPercent = stats ? Math.round((stats.collectedUsd / (stats.expectedUsd || 1)) * 100) : 0

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 34, letterSpacing: '-0.03em', fontWeight: 700, color: 'var(--gr-ink)', margin: 0 }}>
          {greeting}, {profile?.full_name?.split(' ')[0] ?? 'George'}.{' '}
          <span style={{ color: 'var(--gr-stone-2)', fontWeight: 500 }}>
            {stats?.overdueCount ? `${stats.overdueCount} store${stats.overdueCount > 1 ? 's' : ''} need${stats.overdueCount === 1 ? 's' : ''} your attention.` : 'Everything looks good.'}
          </span>
        </h1>
      </motion.div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <KpiCard tone="navy" label="Collected · this month" usd={stats?.collectedUsd} lrd={stats?.collectedLrd}
          delta={`${collPercent}%`} sub={`of $${(stats?.expectedUsd ?? 0).toLocaleString()} expected`} />
        <KpiCard tone="cream" label="Occupancy"
          big={`${stats?.occupiedStores ?? 0} / ${stats?.totalStores ?? 0}`}
          delta={`${stats ? Math.round((stats.occupiedStores / (stats.totalStores || 1)) * 100) : 0}%`}
          sub={`${(stats?.totalStores ?? 0) - (stats?.occupiedStores ?? 0)} vacant`} />
        <KpiCard tone="cream" label="Overdue" big={String(stats?.overdueCount ?? 0)}
          deltaTone="rust" sub={`$${(stats?.overdueAmountUsd ?? 0).toLocaleString()} · L$${(((stats?.overdueAmountUsd ?? 0) * fxRate)).toLocaleString()}`} />
        <KpiCard tone="crimson" label="Receivable · next month" usd={stats?.expectedUsd}
          sub={`due in ${30 - new Date().getDate()} days`} />
      </div>

      {/* Two panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16, minHeight: 360 }}>
        {/* Income chart */}
        <Panel title="Income · Last 6 months">
          {chartData && <IncomeChart data={chartData} />}
        </Panel>

        {/* Recent activity */}
        <Panel title="Recent activity">
          <div style={{ padding: '4px 24px 16px', display: 'flex', flexDirection: 'column' }}>
            {activity.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 13, color: 'var(--gr-stone-2)' }}>No payments yet</div>
            )}
            {activity.map((r, i) => {
              const statusTone = r.status === 'confirmed' ? 'mint' : r.status === 'rejected' ? 'rust' : 'gold'
              const methodLabel = r.method === 'mtn_momo' ? 'MTN MoMo' : r.method === 'bank_transfer' ? 'Bank transfer' : 'Cash'
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--gr-line-2)' : 'none' }}>
                  <Avatar name={r.tenant?.full_name ?? '?'} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tenant?.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>{methodLabel} · {r.store?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--gr-ink)' }}>${r.amount_usd.toLocaleString()}</div>
                    <Pill tone={statusTone} style={{ fontSize: 10, padding: '2px 7px', marginTop: 2 }}>{r.status}</Pill>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────
function KpiCard({ tone, label, big, usd, lrd, delta, deltaTone = 'mint', sub }: any) {
  const palettes: any = {
    cream:   { bg: '#fff',              fg: 'var(--gr-ink)',  dim: 'var(--gr-stone-2)', bd: 'var(--gr-line)' },
    navy:    { bg: 'var(--gr-navy)',     fg: 'var(--gr-cream)',dim: 'rgba(246,241,228,0.6)', bd: 'transparent' },
    crimson: { bg: 'var(--gr-crimson)', fg: '#fff',           dim: 'rgba(255,255,255,0.7)', bd: 'transparent' },
  }
  const p = palettes[tone]
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(11,26,61,0.12)' }}
      transition={{ duration: 0.15 }}
      style={{ padding: '18px 20px', borderRadius: 14, background: p.bg, border: `1px solid ${p.bd}`, color: p.fg, display: 'flex', flexDirection: 'column', minHeight: 124, position: 'relative', overflow: 'hidden', cursor: 'default' }}
    >
      <div style={{ fontSize: 11, color: p.dim, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        {big ? (
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{big}</div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>${(usd ?? 0).toLocaleString()}</div>
            {lrd != null && <div style={{ fontSize: 13, color: p.dim, fontVariantNumeric: 'tabular-nums' }}>L${lrd.toLocaleString()}</div>}
          </>
        )}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, color: p.dim }}>{sub}</span>
        {delta && (
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 999, fontWeight: 600,
            background: deltaTone === 'rust' ? 'rgba(192,74,42,0.16)' : 'rgba(47,184,117,0.16)',
            color: deltaTone === 'rust' ? '#C04A2A' : '#2FB875',
          }}>{delta}</span>
        )}
      </div>
    </motion.div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--gr-line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '16px 24px 14px', borderBottom: '1px solid var(--gr-line-2)' }}>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, color: 'var(--gr-ink)', letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

function IncomeChart({ data }: { data: { label: string; collected: number; expected: number }[] }) {
  const w = 660, h = 240, pad = { l: 50, r: 24, t: 16, b: 36 }
  const maxV = Math.max(...data.map(d => d.expected), 1000) * 1.1
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (data.length - 1 || 1)
  const y = (v: number) => pad.t + (1 - v / maxV) * (h - pad.t - pad.b)
  const linePath = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ')
  const areaPath = (arr: number[]) => linePath(arr) + ` L ${x(arr.length - 1)} ${h - pad.b} L ${x(0)} ${h - pad.b} Z`
  const collected = data.map(d => d.collected)
  const expected  = data.map(d => d.expected)

  return (
    <div style={{ padding: '12px 24px 8px', flex: 1 }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-red" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#D11F2C" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#D11F2C" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, maxV * 0.25, maxV * 0.5, maxV * 0.75, maxV].map(v => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(11,26,61,0.06)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgba(11,26,61,0.45)" fontFamily="var(--f-mono)">
              ${(v / 1000).toFixed(0)}K
            </text>
          </g>
        ))}
        {/* Expected dashed */}
        <path d={linePath(expected)} fill="none" stroke="#0B1A3D" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
        {/* Collected area */}
        <path d={areaPath(collected)} fill="url(#area-red)" />
        <path d={linePath(collected)} fill="none" stroke="#D11F2C" strokeWidth="2.5" />
        {collected.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === collected.length - 1 ? 5 : 3} fill="#D11F2C" stroke="#fff" strokeWidth="2" />
        ))}
        {/* Month labels */}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={h - 12} textAnchor="middle" fontSize="11" fill="rgba(11,26,61,0.55)">{d.label}</text>
        ))}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 24, paddingTop: 8, borderTop: '1px solid var(--gr-line)', fontSize: 12, color: 'var(--gr-stone-2)' }}>
        {[['#D11F2C','Collected',`$${(collected[collected.length-1] ?? 0).toLocaleString()}`],
          ['#0B1A3D','Expected',`$${(expected[expected.length-1] ?? 0).toLocaleString()}`]].map(([c, l, v]) => (
          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            {l} <span style={{ fontWeight: 600, color: 'var(--gr-ink)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
