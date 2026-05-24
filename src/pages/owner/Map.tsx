import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Pill from '@/components/ui/Pill'

interface StoreRow {
  id: string
  code: string
  name: string
  address: string | null
  rent_usd: number
  status: 'vacant' | 'occupied'
  area: { name: string } | null
}

const AREA_COLORS: Record<string, string> = {
  'Broad Street':   '#D11F2C',
  'Carey Street':   '#2563EB',
  'Randall Street': '#2FB875',
  'Paynesville':    '#E9B949',
}

function useStores() {
  return useQuery<StoreRow[]>({
    queryKey: ['map-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*, area:areas(name)')
        .order('code')
      if (error) throw error
      return (data ?? []) as StoreRow[]
    },
    staleTime: 60_000,
  })
}

export default function Map() {
  const { data: stores = [], isLoading } = useStores()

  const byArea = stores.reduce<Record<string, StoreRow[]>>((acc, s) => {
    const area = s.area?.name ?? 'Other'
    if (!acc[area]) acc[area] = []
    acc[area].push(s)
    return acc
  }, {})

  const totalVacant   = stores.filter(s => s.status === 'vacant').length
  const totalOccupied = stores.filter(s => s.status === 'occupied').length

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--gr-stone-2)' }}>
        Loading map…
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total stores',  value: stores.length,  color: 'var(--gr-ink)' },
          { label: 'Occupied',      value: totalOccupied,  color: 'var(--gr-navy)' },
          { label: 'Vacant',        value: totalVacant,    color: 'var(--gr-mint)' },
          { label: 'Areas',         value: Object.keys(byArea).length, color: 'var(--gr-crimson)' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: '#fff', borderRadius: 14, padding: '16px 20px',
            border: '1px solid var(--gr-line)',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'var(--f-display)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Area legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(AREA_COLORS).map(([area, color]) => (
          <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 12, color: 'var(--gr-stone-2)', fontWeight: 500 }}>{area}</span>
          </div>
        ))}
      </div>

      {/* Store grid by area */}
      {Object.entries(byArea).map(([areaName, areaStores]) => {
        const color = AREA_COLORS[areaName] ?? 'var(--gr-stone-2)'
        const vacant   = areaStores.filter(s => s.status === 'vacant').length
        const occupied = areaStores.filter(s => s.status === 'occupied').length

        return (
          <div key={areaName} style={{ marginBottom: 28 }}>
            {/* Area header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              paddingBottom: 10, borderBottom: `2px solid ${color}22`,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>{areaName}</span>
              <span style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>
                {areaStores.length} stores · {occupied} occupied · {vacant} vacant
              </span>
            </div>

            {/* Store grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}>
              {areaStores.map(store => (
                <div
                  key={store.id}
                  style={{
                    borderRadius: 10,
                    border: `1.5px solid ${store.status === 'occupied' ? color + '55' : 'var(--gr-line)'}`,
                    background: store.status === 'occupied' ? color + '0D' : '#fff',
                    padding: '10px 12px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Occupied accent bar */}
                  {store.status === 'occupied' && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: 3, background: color, borderRadius: '10px 10px 0 0',
                    }} />
                  )}
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--gr-ink)',
                    fontFamily: 'var(--f-mono)', marginBottom: 4,
                  }}>
                    {store.code}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginBottom: 6, lineHeight: 1.3 }}>
                    {store.name.replace(/^(Broad St|Carey St|Randall St|Paynesville) /, '')}
                  </div>
                  <Pill tone={store.status === 'vacant' ? 'mint' : 'navy'} style={{ fontSize: 10, padding: '2px 7px' }}>
                    {store.status === 'vacant' ? 'Vacant' : 'Occupied'}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
