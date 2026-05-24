import { useQuery } from '@tanstack/react-query'
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useFxRate, toLrd } from '@/hooks/useFxRate'
import Btn from '@/components/ui/Btn'
import { IconDownload, IconPrinter } from '@/components/ui/Icons'

type MonthlyData = { month: string; label: string; collected: number; expected: number }
type AreaData    = { area: string; count: number; revenue: number }
type TenantDebt  = { tenant: string; store: string; months: number; amount: number }

function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const now    = new Date()
      const months = Array.from({ length: 12 }, (_, i) => subMonths(now, 11 - i))
      const labels = months.map(m => format(m, 'MMM yy'))
      const keys   = months.map(m => format(m, 'yyyy-MM'))

      // Monthly collected (confirmed payments) + expected (active leases per month)
      const [{ data: allPayments }, { data: activeLeases }, { data: allStores }, { data: areasData }] = await Promise.all([
        supabase.from('payments').select('amount_usd, period_month, status').in('period_month', keys),
        supabase.from('leases').select('monthly_rent_usd, start_date, end_date, status'),
        supabase.from('stores').select('id, status, rent_usd, area_id'),
        supabase.from('areas').select('id, name'),
      ])

      const monthlyData: MonthlyData[] = labels.map((label, i) => {
        const key       = keys[i]
        const month     = months[i]
        const collected = (allPayments ?? [])
          .filter((p: any) => p.period_month === key && p.status === 'confirmed')
          .reduce((s: number, p: any) => s + Number(p.amount_usd), 0)
        const expected = (activeLeases ?? [])
          .filter((l: any) => {
            const start = parseISO(l.start_date)
            const end   = l.end_date ? parseISO(l.end_date) : null
            return start <= endOfMonth(month) && (!end || end >= startOfMonth(month))
          })
          .reduce((s: number, l: any) => s + Number(l.monthly_rent_usd), 0)
        return { month: key, label, collected, expected }
      })

      const totalCollected = monthlyData.reduce((s, m) => s + m.collected, 0)
      const totalExpected  = monthlyData.reduce((s, m) => s + m.expected, 0)
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

      // Area breakdown (current month)
      const areaMap: Record<string, { name: string; count: number; revenue: number }> = {}
      for (const a of (areasData ?? [])) areaMap[a.id] = { name: a.name, count: 0, revenue: 0 }
      for (const s of (allStores ?? [])) {
        if (s.status === 'occupied' && s.area_id && areaMap[s.area_id]) {
          areaMap[s.area_id].count++
          areaMap[s.area_id].revenue += Number(s.rent_usd)
        }
      }
      const areaData: AreaData[] = Object.values(areaMap)
        .filter(a => a.count > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .map(a => ({ area: a.name, count: a.count, revenue: a.revenue }))

      // Arrears (overdue tenants)
      const { data: overdueLeases } = await supabase
        .from('leases')
        .select(`
          id, monthly_rent_usd, tenant_id,
          store:stores(code, name),
          tenant:profiles!leases_tenant_id_fkey(full_name)
        `)
        .eq('status', 'active')

      const currentKey = format(now, 'yyyy-MM')
      const prevKey    = format(subMonths(now, 1), 'yyyy-MM')

      const { data: recentConfirmed } = await supabase
        .from('payments')
        .select('tenant_id, period_month')
        .eq('status', 'confirmed')
        .in('period_month', [currentKey, prevKey])

      const paidSet = new Set((recentConfirmed ?? []).map((p: any) => `${p.tenant_id}:${p.period_month}`))

      const arrears: TenantDebt[] = (overdueLeases ?? [])
        .filter((l: any) => !paidSet.has(`${l.tenant_id}:${currentKey}`))
        .map((l: any) => {
          const missedMonths = !paidSet.has(`${l.tenant_id}:${prevKey}`) ? 2 : 1
          return {
            tenant: l.tenant?.full_name ?? 'Unknown',
            store:  (l.store as any)?.code ?? '—',
            months: missedMonths,
            amount: missedMonths * Number(l.monthly_rent_usd),
          }
        })
        .sort((a, b) => b.amount - a.amount)

      const occupiedCount = (allStores ?? []).filter((s: any) => s.status === 'occupied').length
      const totalStores   = (allStores ?? []).length

      return { monthlyData, totalCollected, totalExpected, collectionRate, areaData, arrears, occupiedCount, totalStores }
    },
    staleTime: 60_000,
  })
}

function printReport(data: ReturnType<typeof useReports>['data'], fxRate: number) {
  if (!data) return
  const { monthlyData, totalCollected, totalExpected, collectionRate, areaData, arrears, occupiedCount, totalStores } = data
  const occupancy = totalStores > 0 ? Math.round((occupiedCount / totalStores) * 100) : 0
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>George Rental — Report ${today}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #060914; padding: 32px; font-size: 13px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 28px; border-bottom: 2px solid #060914; padding-bottom: 16px; }
    .logo { font-size: 20px; font-weight: 800; }
    .logo span { color: #D11F2C; }
    .meta { text-align:right; font-size:12px; color:#6B6560; }
    .kpis { display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin-bottom:28px; }
    .kpi { border:1px solid #E5E0D5; border-radius:8px; padding:14px; background:#F9F7F3; }
    .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#9E9893; margin-bottom:6px; }
    .kpi-value { font-size:22px; font-weight:800; color:#060914; }
    .kpi-sub { font-size:11px; color:#6B6560; margin-top:3px; }
    h2 { font-size:14px; font-weight:700; margin-bottom:12px; margin-top:24px; color:#060914; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#9E9893; text-align:left; padding:8px 10px; background:#F9F7F3; border-bottom:1px solid #E5E0D5; }
    td { padding:9px 10px; border-bottom:1px solid #E5E0D5; font-size:12px; color:#060914; }
    td.num { text-align:right; font-family:monospace; }
    .badge { display:inline-block; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:700; }
    .badge-red { background:rgba(209,31,44,0.1); color:#D11F2C; }
    .badge-amber { background:rgba(233,185,73,0.15); color:#9A6F00; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #E5E0D5; font-size:11px; color:#9E9893; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">George<span>Rental</span></div>
      <div style="font-size:12px;color:#6B6560;margin-top:4px">Income &amp; Performance Report</div>
    </div>
    <div class="meta">
      Generated: ${today}<br>
      Broad Street, Central Monrovia, Liberia<br>
      +231 88 605 5575
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total Collected (12m)</div>
      <div class="kpi-value">$${totalCollected.toLocaleString()}</div>
      <div class="kpi-sub">L$${toLrd(totalCollected, fxRate).toLocaleString()}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Expected (12m)</div>
      <div class="kpi-value">$${totalExpected.toLocaleString()}</div>
      <div class="kpi-sub">L$${toLrd(totalExpected, fxRate).toLocaleString()}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Collection Rate</div>
      <div class="kpi-value">${collectionRate}%</div>
      <div class="kpi-sub" style="color:${collectionRate >= 80 ? '#2FB875' : '#C85A00'}">${collectionRate >= 80 ? 'On track' : 'Needs attention'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Occupancy</div>
      <div class="kpi-value">${occupancy}%</div>
      <div class="kpi-sub">${occupiedCount} / ${totalStores} stores occupied</div>
    </div>
  </div>

  <h2>Monthly Income — Last 12 Months</h2>
  <table>
    <thead><tr><th>Month</th><th>Expected</th><th>Collected</th><th>Variance</th><th>Rate</th></tr></thead>
    <tbody>
      ${monthlyData.map(m => {
        const rate = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : 0
        const variance = m.collected - m.expected
        return `<tr>
          <td>${m.label}</td>
          <td class="num">$${m.expected.toLocaleString()}</td>
          <td class="num">$${m.collected.toLocaleString()}</td>
          <td class="num" style="color:${variance >= 0 ? '#2FB875' : '#D11F2C'}">${variance >= 0 ? '+' : ''}$${variance.toLocaleString()}</td>
          <td class="num">${rate}%</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  ${areaData.length > 0 ? `
  <h2>Revenue by Area</h2>
  <table>
    <thead><tr><th>Area</th><th>Stores</th><th>Monthly Revenue</th></tr></thead>
    <tbody>
      ${areaData.map(a => `<tr>
        <td>${a.area}</td>
        <td class="num">${a.count}</td>
        <td class="num">$${a.revenue.toLocaleString()}/mo</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <h2>Arrears — Outstanding Balances</h2>
  ${arrears.length === 0
    ? '<p style="font-size:13px;color:#2FB875;margin-bottom:20px">✓ All tenants are up to date — no arrears.</p>'
    : `<table>
    <thead><tr><th>Tenant</th><th>Store</th><th>Months Overdue</th><th>Amount Owed</th></tr></thead>
    <tbody>
      ${arrears.map(a => `<tr>
        <td>${a.tenant}</td>
        <td>${a.store}</td>
        <td class="num"><span class="badge ${a.months >= 2 ? 'badge-red' : 'badge-amber'}">${a.months} month${a.months > 1 ? 's' : ''}</span></td>
        <td class="num" style="color:#D11F2C;font-weight:700">$${a.amount.toLocaleString()}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <p style="font-size:12px;color:#6B6560">Total outstanding: <strong>$${arrears.reduce((s,a)=>s+a.amount,0).toLocaleString()}</strong></p>`}

  <div class="footer">
    George Rental · ${today} · Confidential — for internal use only
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}

export default function Reports() {
  const { data, isLoading } = useReports()
  const { data: fxRate = 180 } = useFxRate()

  if (isLoading) return (
    <div style={{ padding: '28px 32px', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading reports…</div>
  )

  const { monthlyData = [], totalCollected = 0, totalExpected = 0, collectionRate = 0, areaData = [], arrears = [], occupiedCount = 0, totalStores = 0 } = data ?? {}

  const maxBar = Math.max(...monthlyData.map(m => Math.max(m.collected, m.expected)), 1)

  const areaTotal = areaData.reduce((s, a) => s + a.revenue, 0)
  const colors    = ['var(--gr-crimson)', 'var(--gr-navy)', 'var(--gr-gold)', 'var(--gr-mint)', 'var(--gr-rust)']

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, color: 'var(--gr-ink)' }}>Reports</div>
          <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 4 }}>12-month performance overview</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn kind="ghost" icon={<IconPrinter size={15} />} onClick={() => printReport(data, fxRate)}>Print report</Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Collected (12m)', value: `$${totalCollected.toLocaleString()}`, sub: `L$${toLrd(totalCollected, fxRate).toLocaleString()}` },
          { label: 'Total Expected (12m)', value: `$${totalExpected.toLocaleString()}`, sub: `L$${toLrd(totalExpected, fxRate).toLocaleString()}` },
          { label: 'Collection Rate', value: `${collectionRate}%`, sub: collectionRate >= 80 ? 'On track' : 'Needs attention', subColor: collectionRate >= 80 ? 'var(--gr-mint)' : 'var(--gr-rust)' },
          { label: 'Occupancy', value: `${totalStores > 0 ? Math.round((occupiedCount / totalStores) * 100) : 0}%`, sub: `${occupiedCount} / ${totalStores} stores occupied` },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--gr-line)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, color: 'var(--gr-ink)' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: k.subColor ?? 'var(--gr-stone-2)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        {/* Bar chart */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', padding: '24px 28px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 4 }}>Monthly Income vs Expected</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gr-crimson)' }} />
              <span style={{ color: 'var(--gr-stone-2)' }}>Collected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gr-line)', border: '1px dashed var(--gr-stone-2)' }} />
              <span style={{ color: 'var(--gr-stone-2)' }}>Expected</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
            {monthlyData.map(m => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                  <div
                    title={`Expected: $${m.expected.toLocaleString()}`}
                    style={{
                      flex: 1, borderRadius: '3px 3px 0 0',
                      background: 'var(--gr-paper)', border: '1px dashed var(--gr-line)',
                      height: `${(m.expected / maxBar) * 100}%`,
                    }}
                  />
                  <div
                    title={`Collected: $${m.collected.toLocaleString()}`}
                    style={{
                      flex: 1, borderRadius: '3px 3px 0 0',
                      background: 'var(--gr-crimson)',
                      height: `${(m.collected / maxBar) * 100}%`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 9, color: 'var(--gr-stone-2)', whiteSpace: 'nowrap' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Area donut */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', padding: '24px 28px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 20 }}>Revenue by Area</div>
          {areaData.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>No area data available</div>
          ) : (
            <>
              {/* Simple bar-based donut alternative */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {areaData.map((a, i) => {
                  const pct = areaTotal > 0 ? (a.revenue / areaTotal) * 100 : 0
                  return (
                    <div key={a.area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length] }} />
                          <span style={{ fontSize: 13, color: 'var(--gr-ink)', fontWeight: 500 }}>{a.area}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>${a.revenue.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--gr-paper)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 3 }}>{pct.toFixed(1)}% · {a.count} stores</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Arrears table */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--gr-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>Arrears — Outstanding Tenants</div>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{arrears.length} tenants with unpaid rent</div>
          </div>
          {arrears.length > 0 && (
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(209,31,44,0.08)', color: 'var(--gr-crimson)',
              fontSize: 12, fontWeight: 600,
            }}>
              Total: ${arrears.reduce((s, a) => s + a.amount, 0).toLocaleString()}
            </div>
          )}
        </div>

        {arrears.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>
            No arrears — all tenants are up to date.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px',
              padding: '10px 24px', borderBottom: '1px solid var(--gr-line)',
              fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              <span>Tenant</span>
              <span>Store</span>
              <span>Months</span>
              <span>Owed</span>
            </div>
            {arrears.map((a, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 100px 120px',
                padding: '13px 24px', borderBottom: i < arrears.length - 1 ? '1px solid var(--gr-line)' : 'none',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{a.tenant}</div>
                <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', fontFamily: 'var(--f-mono)' }}>{a.store}</div>
                <div style={{ fontSize: 13, color: a.months >= 2 ? 'var(--gr-rust)' : 'var(--gr-gold)', fontWeight: 600 }}>
                  {a.months} {a.months === 1 ? 'month' : 'months'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-crimson)' }}>${a.amount.toLocaleString()}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
