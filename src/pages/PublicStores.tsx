import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Store, Area } from '@/types'
import GRLogo from '@/components/ui/GRLogo'
import Pill from '@/components/ui/Pill'
import { IconSearch, IconArrow } from '@/components/ui/Icons'
import StoreThumb from '@/components/ui/StoreThumb'
import { useWindowWidth } from '@/hooks/useWindowWidth'

type StoreWithArea = Store & { area: Pick<Area, 'name'> | null }

function usePublicStores() {
  return useQuery<StoreWithArea[]>({
    queryKey: ['public-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*, area:areas(name)')
        .order('name')
      if (error) throw error
      return (data ?? []) as StoreWithArea[]
    },
    staleTime: 60_000,
  })
}

type FilterStatus = 'all' | 'vacant' | 'occupied'

export default function PublicStores() {
  const { data: stores = [], isLoading } = usePublicStores()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const w = useWindowWidth()
  const isMobile = w < 640

  const filtered = stores.filter(s => {
    const matchQ = !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.code.toLowerCase().includes(q.toLowerCase()) ||
      (s.area?.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (s.address ?? '').toLowerCase().includes(q.toLowerCase())
    const matchF = filter === 'all' || s.status === filter
    return matchQ && matchF
  })

  const vacantCount   = stores.filter(s => s.status === 'vacant').length
  const occupiedCount = stores.filter(s => s.status === 'occupied').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gr-paper)', fontFamily: 'var(--f-body)' }}>
      {/* Nav */}
      <header style={{
        background: 'var(--gr-midnight)',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          padding: isMobile ? '0 20px' : '0 48px', height: 68,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <GRLogo size={20} />
          </Link>
          <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isMobile && (
              <>
                <Link to="/" style={{ fontSize: 13, color: 'rgba(246,241,228,0.65)', textDecoration: 'none' }}>Home</Link>
                <Link to="/stores" style={{ fontSize: 13, color: 'var(--gr-cream)', fontWeight: 600, textDecoration: 'none' }}>Stores</Link>
              </>
            )}
            <Link to="/sign-in" style={{
              height: 34, padding: '0 16px', background: 'var(--gr-crimson)', color: '#fff',
              borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
              textDecoration: 'none', gap: 6,
            }}>
              Sign in <IconArrow size={13} stroke="#fff" />
            </Link>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  background: 'rgba(246,241,228,0.08)', border: '1px solid rgba(246,241,228,0.15)',
                  borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                <span style={{ display: 'block', width: 16, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }} />
                <span style={{ display: 'block', width: 16, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: 'block', width: 16, height: 2, background: 'var(--gr-cream)', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }} />
              </button>
            )}
          </nav>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {isMobile && menuOpen && (
            <motion.div
              key="stores-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              style={{
                background: 'rgba(6,9,20,0.97)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(246,241,228,0.08)',
                padding: '8px 20px 16px',
                display: 'flex', flexDirection: 'column', gap: 0,
              }}
            >
              {[
                { label: 'Home',    to: '/' },
                { label: 'Stores',  to: '/stores' },
                { label: 'Sign in', to: '/sign-in' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block', padding: '13px 4px',
                    color: 'rgba(246,241,228,0.85)', textDecoration: 'none', fontSize: 16, fontWeight: 500,
                    borderBottom: '1px solid rgba(246,241,228,0.07)',
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero strip */}
      <div style={{
        background: 'var(--gr-midnight)', padding: isMobile ? '28px 20px 32px' : '40px 48px 48px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Monrovia Commercial Properties
          </div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: isMobile ? 28 : 36, fontWeight: 700, color: 'var(--gr-cream)', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Available Stores
          </div>
          <div style={{ fontSize: 14, color: 'rgba(246,241,228,0.6)', lineHeight: 1.6 }}>
            Browse all {stores.length} George Rental storefronts across 4 areas in Monrovia.
            {vacantCount > 0 && <> <span style={{ color: 'var(--gr-mint)', fontWeight: 600 }}>{vacantCount} currently vacant</span> and available for lease.</>}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginTop: 20, maxWidth: isMobile ? '100%' : 440 }}>
            <IconSearch size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(246,241,228,0.4)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name, area, address…"
              style={{
                width: '100%', height: 46, paddingLeft: 42, paddingRight: 16,
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)', fontSize: 14,
                color: 'var(--gr-cream)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Filters + grid */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {([
            { label: `All (${stores.length})`,         value: 'all' as FilterStatus },
            { label: `Vacant (${vacantCount})`,        value: 'vacant' as FilterStatus },
            { label: `Occupied (${occupiedCount})`,    value: 'occupied' as FilterStatus },
          ]).map(t => (
            <button
              type="button"
              key={t.value}
              onClick={() => setFilter(t.value)}
              style={{
                padding: '7px 16px', borderRadius: 20, border: '1px solid var(--gr-line)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: filter === t.value ? 'var(--gr-midnight)' : '#fff',
                color: filter === t.value ? 'var(--gr-cream)' : 'var(--gr-stone-2)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gr-stone-2)' }}>Loading stores…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏪</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gr-ink)' }}>No stores found</div>
            <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 6 }}>Try adjusting your search.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {filtered.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  background: '#fff', borderRadius: 16,
                  border: '1px solid var(--gr-line)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(6,9,20,0.05)',
                }}
              >
                {/* Thumbnail */}
                <div style={{ height: 140, background: 'var(--gr-paper)', position: 'relative', overflow: 'hidden' }}>
                  {store.photo_url ? (
                    <img src={store.photo_url} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StoreThumb seed={i} w={100} h={100} />
                    </div>
                  )}
                  {/* Status badge */}
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <Pill tone={store.status === 'vacant' ? 'mint' : 'navy'}>
                      {store.status === 'vacant' ? 'Available' : 'Occupied'}
                    </Pill>
                  </div>
                  {/* Code badge */}
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'rgba(6,9,20,0.7)', backdropFilter: 'blur(4px)',
                    borderRadius: 6, padding: '3px 8px',
                    fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'var(--f-mono)',
                  }}>
                    {store.code}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 4 }}>{store.name}</div>
                  {store.address && (
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginBottom: 6 }}>{store.address}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    {store.area?.name && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: 'var(--gr-paper)', color: 'var(--gr-stone-2)',
                        border: '1px solid var(--gr-line)',
                      }}>
                        {store.area.name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginBottom: 2 }}>Monthly rent</div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>
                        ${store.rent_usd.toLocaleString()}
                        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--gr-stone-2)', marginLeft: 3 }}>/mo</span>
                      </div>
                    </div>
                    <Link to={`/stores/${store.id}`} style={{
                      padding: '8px 14px', borderRadius: 8,
                      background: store.status === 'vacant' ? 'var(--gr-crimson)' : 'var(--gr-paper)',
                      color: store.status === 'vacant' ? '#fff' : 'var(--gr-stone)',
                      border: store.status === 'vacant' ? 'none' : '1px solid var(--gr-line)',
                      fontSize: 12, fontWeight: 600, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      {store.status === 'vacant' ? 'Enquire' : 'View'} <IconArrow size={12} stroke="currentColor" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA at bottom */}
        <div style={{
          marginTop: 48, padding: isMobile ? '28px 20px' : '36px 40px', borderRadius: 20,
          background: 'var(--gr-midnight)', textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 24, fontWeight: 700, color: 'var(--gr-cream)', marginBottom: 8 }}>
            Already a tenant?
          </div>
          <div style={{ fontSize: 14, color: 'rgba(246,241,228,0.6)', marginBottom: 24 }}>
            Sign in to pay rent, view receipts, and submit maintenance requests.
          </div>
          <Link to="/sign-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 46, padding: '0 24px', background: 'var(--gr-crimson)',
            color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign in to your account <IconArrow size={14} stroke="#fff" />
          </Link>
        </div>
      </div>
    </div>
  )
}
