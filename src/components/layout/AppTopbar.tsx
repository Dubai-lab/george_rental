import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Btn from '@/components/ui/Btn'
import { IconSearch, IconBell, IconPlus } from '@/components/ui/Icons'
import { format } from 'date-fns'

interface AppTopbarProps {
  title?:              string
  subtitle?:           string
  searchPlaceholder?:  string
  children?:           ReactNode
  onRecordPayment?:    () => void
  notificationCount?:  number
}

export default function AppTopbar({
  title              = 'Overview',
  subtitle,
  searchPlaceholder  = 'Search stores, tenants, payments…',
  children,
  onRecordPayment,
  notificationCount  = 0,
}: AppTopbarProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const navigate = useNavigate()
  const today = format(new Date(), 'EEEE, d MMM yyyy')

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

      {/* Notifications */}
      <button
        onClick={() => navigate('/maintenance')}
        style={{
          width: 38, height: 38, borderRadius: 10,
          border: '1px solid var(--gr-line)', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer',
        }}
      >
        <IconBell size={16} stroke="var(--gr-ink)" />
        {notificationCount > 0 && (
          <span style={{
            position: 'absolute', top: 7, right: 8,
            width: 7, height: 7, background: 'var(--gr-crimson)',
            borderRadius: 99, border: '1.5px solid #fff',
          }} />
        )}
      </button>

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
