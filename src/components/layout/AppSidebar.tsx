import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useFxRate } from '@/hooks/useFxRate'
import GRLogo from '@/components/ui/GRLogo'
import {
  IconHome, IconStore, IconUsers, IconCash,
  IconWrench, IconChart, IconMap, IconMail, IconSettings, IconLogout,
} from '@/components/ui/Icons'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { path: '/owner/dashboard',   label: 'Overview',     Icon: IconHome    },
  { path: '/owner/stores',      label: 'Stores',       Icon: IconStore,  badge: 'stores'      },
  { path: '/owner/tenants',     label: 'Tenants',      Icon: IconUsers,  badge: 'tenants'     },
  { path: '/owner/payments',    label: 'Payments',     Icon: IconCash    },
  { path: '/owner/maintenance', label: 'Maintenance',  Icon: IconWrench, badge: 'maintenance', dot: true },
  { path: '/owner/enquiries',   label: 'Enquiries',    Icon: IconMail,   badge: 'enquiries',   dot: true },
  { path: '/owner/reports',     label: 'Reports',      Icon: IconChart   },
  { path: '/owner/map',         label: 'Map view',     Icon: IconMap     },
  { path: '/owner/settings',    label: 'Settings',     Icon: IconSettings },
]

interface AppSidebarProps {
  storeBadge?:       number
  tenantBadge?:      number
  maintenanceBadge?: number
  enquiriesBadge?:   number
}

export default function AppSidebar({ storeBadge, tenantBadge, maintenanceBadge, enquiriesBadge }: AppSidebarProps) {
  const { profile, signOut } = useAuth()
  const { data: fxRate } = useFxRate()
  const [fxOpen, setFxOpen]   = useState(false)
  const [newRate, setNewRate]  = useState('')
  const [saving,  setSaving]   = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const badges: Record<string, number | undefined> = {
    stores:      storeBadge,
    tenants:     tenantBadge,
    maintenance: maintenanceBadge,
    enquiries:   enquiriesBadge,
  }

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  async function saveRate() {
    const r = parseFloat(newRate)
    if (!r || r <= 0) return
    setSaving(true)
    await supabase.from('fx_rates').insert({ rate: r, set_by: profile?.id })
    qc.invalidateQueries({ queryKey: ['fx-rate'] })
    setSaving(false)
    setFxOpen(false)
    setNewRate('')
  }

  const initials = profile?.full_name?.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() ?? 'GW'

  return (
    <aside style={{
      width: 240, height: '100%', minHeight: 0,
      background: 'var(--gr-midnight)', color: 'var(--gr-cream)',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(246,241,228,0.06)',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 22px 18px' }}>
        <GRLogo size={20} />
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'rgba(246,241,228,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 10px 8px' }}>
          Workspace
        </div>

        {NAV.map(({ path, label, Icon, badge, dot }) => (
          <NavLink key={path} to={path} end={path === '/owner/dashboard'} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  height: 36, padding: '0 12px', borderRadius: 8,
                  background: isActive ? 'rgba(209,31,44,0.16)' : 'transparent',
                  color: isActive ? 'var(--gr-cream)' : 'rgba(246,241,228,0.7)',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.15s',
                }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute', left: -12, top: 8, bottom: 8,
                    width: 3, background: 'var(--gr-crimson)', borderRadius: 2,
                  }} />
                )}
                <span style={{ color: isActive ? 'var(--gr-crimson)' : 'rgba(246,241,228,0.55)', flexShrink: 0 }}>
                  <Icon size={18} stroke="currentColor" />
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {badge && badges[badge] != null && (
                  <span style={{
                    fontSize: 11, padding: '2px 7px', borderRadius: 999, fontWeight: 600,
                    background: dot ? 'var(--gr-crimson)' : 'rgba(246,241,228,0.08)',
                    color: dot ? '#fff' : 'rgba(246,241,228,0.8)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {badges[badge]}
                  </span>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FX Rate widget */}
      <div style={{ margin: '8px 12px', padding: 14, background: 'rgba(246,241,228,0.04)', borderRadius: 10, border: '1px solid rgba(246,241,228,0.06)' }}>
        <div style={{ fontSize: 10, color: 'rgba(246,241,228,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Exchange rate</span>
          <button onClick={() => setFxOpen(v => !v)} style={{ background: 'none', border: 'none', color: 'rgba(246,241,228,0.5)', cursor: 'pointer', padding: 0 }}>
            <IconSettings size={11} stroke="currentColor" />
          </button>
        </div>
        {fxOpen ? (
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <input
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder={String(fxRate ?? 180)}
              type="number"
              style={{
                flex: 1, height: 28, borderRadius: 6, border: '1px solid rgba(246,241,228,0.2)',
                background: 'rgba(246,241,228,0.06)', color: 'var(--gr-cream)',
                fontSize: 13, padding: '0 8px',
              }}
            />
            <button onClick={saveRate} disabled={saving} style={{
              height: 28, padding: '0 10px', borderRadius: 6,
              background: 'var(--gr-crimson)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600,
            }}>
              {saving ? '…' : 'Save'}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 6, fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, color: 'var(--gr-cream)', letterSpacing: '-0.01em' }}>
            $1 = L${fxRate ?? 180}
          </div>
        )}
        {!fxOpen && <div style={{ fontSize: 10, color: 'rgba(246,241,228,0.5)', marginTop: 2 }}>set manually · click ⚙ to edit</div>}
      </div>

      {/* User */}
      <div style={{ padding: '10px 14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(246,241,228,0.06)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--gr-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-display)', fontWeight: 700, color: '#fff', fontSize: 14 }}>
          {initials}
        </div>
        <div style={{ flex: 1, fontSize: 12, minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name ?? 'Owner'}</div>
          <div style={{ color: 'rgba(246,241,228,0.5)', fontSize: 11 }}>Owner</div>
        </div>
        <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: 'rgba(246,241,228,0.5)', cursor: 'pointer', padding: 4 }}
          title="Sign out">
          <IconLogout size={14} stroke="currentColor" />
        </button>
      </div>
    </aside>
  )
}
