import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import AppSidebar from './AppSidebar'
import AppTopbar  from './AppTopbar'
import RecordPaymentModal from '@/components/modals/RecordPaymentModal'

const TITLES: Record<string, string> = {
  '/owner/dashboard':   'Overview',
  '/owner/stores':      'Stores',
  '/owner/tenants':     'Tenants',
  '/owner/payments':    'Payments',
  '/owner/maintenance': 'Maintenance',
  '/owner/enquiries':   'Enquiries',
  '/owner/reports':     'Reports',
  '/owner/map':         'Map view',
  '/owner/settings':    'Settings',
}

const SUBTITLES: Record<string, string> = {
  '/owner/stores':     '50 properties · 4 areas in Monrovia',
  '/owner/reports':    'Income, arrears & occupancy across all stores',
  '/owner/tenants':    'All active and past tenants',
  '/owner/payments':   'All payment records',
  '/owner/enquiries':  'Rental interest submitted from the public store listing',
}

export default function DashboardLayout() {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const location = useLocation()
  const title    = TITLES[location.pathname]   ?? 'Overview'
  const subtitle = SUBTITLES[location.pathname]

  const { data: newEnquiries = 0 } = useQuery<number>({
    queryKey: ['enquiries-badge'],
    queryFn: async () => {
      const { count } = await supabase
        .from('store_enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
      return count ?? 0
    },
    staleTime: 60_000,
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--gr-paper)' }}>
      <AppSidebar enquiriesBadge={newEnquiries || undefined} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <AppTopbar
          title={title}
          subtitle={subtitle}
          onRecordPayment={() => setPaymentOpen(true)}
        />

        <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{ height: '100%' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {paymentOpen && (
          <RecordPaymentModal onClose={() => setPaymentOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
