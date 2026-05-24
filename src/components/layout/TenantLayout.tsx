import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IconHome, IconCash, IconFile, IconWrench, IconSettings } from '@/components/ui/Icons'

const TABS = [
  { path: '/tenant',              label: 'Home',       Icon: IconHome,     end: true },
  { path: '/tenant/pay',         label: 'Pay',        Icon: IconCash              },
  { path: '/tenant/receipts',    label: 'Receipts',   Icon: IconFile              },
  { path: '/tenant/maintenance', label: 'Requests',   Icon: IconWrench            },
  { path: '/tenant/profile',     label: 'Profile',    Icon: IconSettings          },
]

export default function TenantLayout() {
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
