import { ReactNode, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Btn from '@/components/ui/Btn'
import { IconSearch, IconBell, IconPlus } from '@/components/ui/Icons'
import { format } from 'date-fns'

interface AppTopbarProps {
  title?:           string
  subtitle?:        string
  searchPlaceholder?: string
  children?:        ReactNode
  onRecordPayment?: () => void
}

function useNotifications() {
  return useQuery({
    queryKey: ['topbar-notifications'],
    queryFn: async () => {
      const [pendingRes, maintRes, enquiryRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount_usd, created_at, store:stores(name), tenant:profiles!payments_tenant_id_fkey(full_name)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('maintenance_requests')
          .select('id, title, priority, created_at, store:stores(name)')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('store_enquiries')
          .select('id, name, created_at, store:stores(name)')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      const pending   = (pendingRes.data  ?? []) as any[]
      const maint     = (maintRes.data    ?? []) as any[]
      const enquiries = (enquiryRes.data  ?? []) as any[]
      return { pending, maint, enquiries, total: pending.length + maint.length + enquiries.length }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export default function AppTopbar({
  title             = 'Overview',
  subtitle,
  searchPlaceholder = 'Search stores, tenants, payments…',
  children,
  onRecordPayment,
}: AppTopbarProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [bellOpen, setBellOpen]           = useState(false)
  const bellRef   = useRef<HTMLDivElement>(null)
  const navigate  = useNavigate()
  const today     = format(new Date(), 'EEEE, d MMM yyyy')
  const { data: notifs } = useNotifications()

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const total = notifs?.total ?? 0

  return (
    <div style={{
      height: 72, borderBottom: '1px solid var(--gr-line)',
      background: '#fff', padding: '0 32px',
      display: 'flex', alignItems: 'center', gap: 20,
      flexShrink: 0,
    }}>
      {/* Title */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>
          {subtitle ?? today}
        </div>
      </div>

      {/* Search */}
      <motion.div
        animate={{ width: searchFocused ? 480 : 360 }}
        transition={{ duration: 0.2 }}
        style={{
          height: 38, background: 'var(--gr-paper)',
          border: `1px solid ${searchFocused ? 'var(--gr-navy)' : 'var(--gr-line)'}`,
          borderRadius: 10, display: 'flex', alignItems: 'center',
          padding: '0 12px', gap: 10, flexShrink: 0,
          transition: 'border-color 0.15s',
        }}
      >
        <IconSearch size={15} stroke="var(--gr-stone-2)" />
        <input
          placeholder={searchPlaceholder}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--gr-ink)', outline: 'none',
          }}
        />
        <AnimatePresence>
          {!searchFocused && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                padding: '2px 6px', background: '#fff',
                border: '1px solid var(--gr-line)', borderRadius: 4,
                fontSize: 10, color: 'var(--gr-stone-2)', fontFamily: 'var(--f-mono)',
              }}
            >
              ⌘K
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <div style={{ flex: 1 }} />
      {children}

      {/* Bell + dropdown */}
      <div ref={bellRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setBellOpen(v => !v)}
          style={{
            width: 38, height: 38, borderRadius: 10,
            border: `1px solid ${bellOpen ? 'var(--gr-navy)' : 'var(--gr-line)'}`,
            background: bellOpen ? 'rgba(11,26,61,0.04)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <IconBell size={16} stroke="var(--gr-ink)" />
          {total > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 7,
              minWidth: 16, height: 16, background: 'var(--gr-crimson)',
              borderRadius: 99, border: '1.5px solid #fff',
              fontSize: 9, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {total > 9 ? '9+' : total}
            </span>
          )}
        </button>

        <AnimatePresence>
          {bellOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 360, background: '#fff', borderRadius: 14,
                border: '1px solid var(--gr-line)',
                boxShadow: '0 16px 48px rgba(6,9,20,0.14)',
                zIndex: 500, overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gr-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gr-ink)' }}>Notifications</div>
                {total > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gr-crimson)' }}>{total} pending</span>
                )}
              </div>

              {total === 0 ? (
                <div style={{ padding: '36px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>All clear</div>
                  <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 4 }}>No pending items right now.</div>
                </div>
              ) : (
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>

                  {/* Pending Payments */}
                  {(notifs?.pending.length ?? 0) > 0 && (
                    <NotifSection
                      emoji="💳"
                      title={`${notifs!.pending.length} Payment${notifs!.pending.length > 1 ? 's' : ''} awaiting approval`}
                      tone="#E9B949"
                      onViewAll={() => { setBellOpen(false); navigate('/owner/payments') }}
                    >
                      {notifs!.pending.map((p: any) => (
                        <NotifRow
                          key={p.id}
                          primary={p.tenant?.full_name ?? 'Unknown'}
                          secondary={`$${p.amount_usd} · ${p.store?.name ?? '—'}`}
                          time={p.created_at}
                          onClick={() => { setBellOpen(false); navigate('/owner/payments') }}
                        />
                      ))}
                    </NotifSection>
                  )}

                  {/* Maintenance */}
                  {(notifs?.maint.length ?? 0) > 0 && (
                    <NotifSection
                      emoji="🔧"
                      title={`${notifs!.maint.length} Maintenance request${notifs!.maint.length > 1 ? 's' : ''} open`}
                      tone="#D11F2C"
                      onViewAll={() => { setBellOpen(false); navigate('/owner/maintenance') }}
                    >
                      {notifs!.maint.map((m: any) => (
                        <NotifRow
                          key={m.id}
                          primary={m.title}
                          secondary={`${m.store?.name ?? '—'} · ${m.priority}`}
                          time={m.created_at}
                          onClick={() => { setBellOpen(false); navigate('/owner/maintenance') }}
                        />
                      ))}
                    </NotifSection>
                  )}

                  {/* Enquiries */}
                  {(notifs?.enquiries.length ?? 0) > 0 && (
                    <NotifSection
                      emoji="📬"
                      title={`${notifs!.enquiries.length} New enquir${notifs!.enquiries.length > 1 ? 'ies' : 'y'}`}
                      tone="#2FB875"
                      onViewAll={() => { setBellOpen(false); navigate('/owner/enquiries') }}
                    >
                      {notifs!.enquiries.map((e: any) => (
                        <NotifRow
                          key={e.id}
                          primary={e.name}
                          secondary={e.store?.name ?? '—'}
                          time={e.created_at}
                          onClick={() => { setBellOpen(false); navigate('/owner/enquiries') }}
                        />
                      ))}
                    </NotifSection>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Record payment CTA */}
      <Btn
        kind="crimson"
        icon={<IconPlus size={15} stroke="#fff" />}
        onClick={onRecordPayment}
      >
        Record payment
      </Btn>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function NotifSection({ emoji, title, tone, children, onViewAll }: {
  emoji: string; title: string; tone: string
  children: ReactNode; onViewAll: () => void
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--gr-line)' }}>
      <div style={{ padding: '10px 18px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span>{emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: tone, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        </div>
        <button type="button" onClick={onViewAll} style={{ fontSize: 11, fontWeight: 600, color: 'var(--gr-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>
          View all →
        </button>
      </div>
      {children}
    </div>
  )
}

function NotifRow({ primary, secondary, time, onClick }: {
  primary: string; secondary: string; time: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--gr-paper)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{primary}</div>
        <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>{secondary}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', whiteSpace: 'nowrap', marginTop: 2 }}>
        {format(new Date(time), 'dd MMM')}
      </div>
    </button>
  )
}
