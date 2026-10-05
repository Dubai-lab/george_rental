import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useWindowWidth } from '@/hooks/useWindowWidth'
import GRLogo from '@/components/ui/GRLogo'
import Avatar from '@/components/ui/Avatar'
import { IconHome, IconCash, IconFile, IconWrench, IconSettings, IconLogout } from '@/components/ui/Icons'

const TABS = [
  { path: '/tenant',              label: 'Home',       desktopLabel: 'Home',        Icon: IconHome,     end: true },
  { path: '/tenant/pay',         label: 'Pay',        desktopLabel: 'Pay rent',    Icon: IconCash              },
  { path: '/tenant/receipts',    label: 'Receipts',   desktopLabel: 'Receipts',    Icon: IconFile              },
  { path: '/tenant/maintenance', label: 'Requests',   desktopLabel: 'Maintenance', Icon: IconWrench            },
  { path: '/tenant/profile',     label: 'Profile',    desktopLabel: 'Profile',     Icon: IconSettings          },
]

// Below this width the portal keeps its phone layout (bottom tab bar).
export const TENANT_DESKTOP_MIN = 900

export default function TenantLayout() {
  const width = useWindowWidth()
  return width >= TENANT_DESKTOP_MIN ? <DesktopLayout /> : <MobileLayout />
}

// ── Desktop: a normal website — top navigation, wide content ────────────────
function DesktopLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isHome   = location.pathname === '/tenant' || location.pathname === '/tenant/'

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gr-paper)' }}>
      <header style={{
        background: 'var(--gr-midnight)', position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto', height: 68, padding: '0 32px',
          display: 'flex', alignItems: 'center', gap: 28,
        }}>
          <Link to="/tenant" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <GRLogo size={20} />
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            {TABS.map(({ path, desktopLabel, Icon, end }) => (
              <NavLink key={path} to={path} end={end} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 38, padding: '0 14px', borderRadius: 9,
                    background: isActive ? 'rgba(209,31,44,0.18)' : 'transparent',
                    color: isActive ? 'var(--gr-cream)' : 'rgba(246,241,228,0.68)',
                    fontSize: 13, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                    <Icon size={16} stroke={isActive ? 'var(--gr-crimson)' : 'rgba(246,241,228,0.55)'} />
                    {desktopLabel}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          <Link to="/stores" style={{
            height: 36, padding: '0 14px', borderRadius: 8,
            border: '1px solid rgba(246,241,228,0.18)', color: 'rgba(246,241,228,0.85)',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
          }}>
            Browse stores
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Avatar name={profile?.full_name ?? '?'} size={34} />
            <div style={{ fontSize: 12, lineHeight: 1.3, maxWidth: 160 }}>
              <div style={{ fontWeight: 600, color: 'var(--gr-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name}
              </div>
              <div style={{ color: 'rgba(246,241,228,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email}
              </div>
            </div>
            <button
              type="button" onClick={handleSignOut} title="Sign out" aria-label="Sign out"
              style={{
                width: 34, height: 34, borderRadius: 8, marginLeft: 4,
                background: 'rgba(246,241,228,0.06)', border: '1px solid rgba(246,241,228,0.12)',
                color: 'rgba(246,241,228,0.7)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconLogout size={15} stroke="currentColor" />
            </button>
          </div>
        </div>
      </header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ flex: 1, width: '100%', maxWidth: isHome ? 1180 : 780, margin: '0 auto', padding: '32px 32px 48px' }}
      >
        {isHome ? (
          <Outlet />
        ) : (
          // Form-style pages read best in a single centred column
          <div style={{ background: '#fff', border: '1px solid var(--gr-line)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--sh-1)' }}>
            <Outlet />
          </div>
        )}
      </motion.main>

      <footer style={{ borderTop: '1px solid var(--gr-line)', padding: '18px 32px', textAlign: 'center', fontSize: 12, color: 'var(--gr-stone-2)' }}>
        George Rental · +231 88 605 5575 ·{' '}
        <Link to="/privacy" style={{ color: 'var(--gr-stone-2)', textDecoration: 'underline' }}>Privacy</Link>
        {' · '}
        <Link to="/terms" style={{ color: 'var(--gr-stone-2)', textDecoration: 'underline' }}>Terms &amp; Refunds</Link>
      </footer>
    </div>
  )
}

// ── Mobile: app-style layout with a bottom tab bar ──────────────────────────
function MobileLayout() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--gr-paper)',
      maxWidth: 480, margin: '0 auto',
      position: 'relative',
    }}>
      {/* Content */}
      <motion.main
        style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Outlet />
      </motion.main>

      {/* Tab bar */}
      <nav style={{
        padding: '8px 12px 20px',
        background: '#fff',
        borderTop: '1px solid var(--gr-line-2)',
        display: 'flex', justifyContent: 'space-around',
        flexShrink: 0,
      }}>
        {TABS.map(({ path, label, Icon, end }) => (
          <NavLink key={path} to={path} end={end} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: isActive ? 'var(--gr-crimson)' : 'var(--gr-stone-2)',
                fontSize: 9, fontWeight: 600, minWidth: 52, paddingTop: 4,
                position: 'relative',
              }}>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      width: 28, height: 3, borderRadius: 99, background: 'var(--gr-crimson)',
                    }}
                  />
                )}
                <Icon size={21} stroke={isActive ? 'var(--gr-crimson)' : 'var(--gr-stone-2)'} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
