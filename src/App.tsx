import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'
import DashboardLayout from '@/components/layout/DashboardLayout'
import TenantLayout from '@/components/layout/TenantLayout'

const Landing        = lazy(() => import('@/pages/Landing'))
const SignIn         = lazy(() => import('@/pages/SignIn'))
const AcceptInvite   = lazy(() => import('@/pages/AcceptInvite'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword  = lazy(() => import('@/pages/ResetPassword'))
const PublicStores   = lazy(() => import('@/pages/PublicStores'))
const StoreDetail    = lazy(() => import('@/pages/StoreDetail'))
const PrivacyPolicy  = lazy(() => import('@/pages/PrivacyPolicy'))

const Dashboard   = lazy(() => import('@/pages/owner/Dashboard'))
const Stores      = lazy(() => import('@/pages/owner/Stores'))
const Tenants     = lazy(() => import('@/pages/owner/Tenants'))
const Payments    = lazy(() => import('@/pages/owner/Payments'))
const Reports     = lazy(() => import('@/pages/owner/Reports'))
const Maintenance = lazy(() => import('@/pages/owner/Maintenance'))
const MapView     = lazy(() => import('@/pages/owner/Map'))
const Enquiries   = lazy(() => import('@/pages/owner/Enquiries'))
const Settings    = lazy(() => import('@/pages/owner/Settings'))
const Agreement   = lazy(() => import('@/pages/owner/Agreement'))

const TenantHome        = lazy(() => import('@/pages/tenant/TenantHome'))
const PayRent           = lazy(() => import('@/pages/tenant/PayRent'))
const Receipts          = lazy(() => import('@/pages/tenant/Receipts'))
const TenantMaintenance = lazy(() => import('@/pages/tenant/TenantMaintenance'))
const TenantProfile     = lazy(() => import('@/pages/tenant/TenantProfile'))

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  // 1. Still resolving session → show spinner
  if (loading) return <LoadingScreen />
  // 2. No session at all → send to sign-in
  if (!user) return <Navigate to="/sign-in" replace />
  // 3. Session exists but profile not yet loaded → keep spinner
  //    (avoids a flash-redirect while the async profile fetch is in flight)
  if (!profile) return <LoadingScreen />
  // 4. Wrong role
  if (profile.role !== 'owner') return <Navigate to="/tenant" replace />
  return <>{children}</>
}

function TenantRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/" replace />
  if (!profile) return <LoadingScreen />
  if (profile.role !== 'tenant') return <Navigate to="/owner" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Landing />
  if (!profile) return <LoadingScreen />
  if (profile.role === 'owner') return <Navigate to="/owner" replace />
  return <Navigate to="/tenant" replace />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/sign-in"         element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/stores"          element={<PublicStores />} />
        <Route path="/stores/:id"      element={<StoreDetail />} />
        <Route path="/accept-invite"   element={<AcceptInvite />} />
        <Route path="/privacy"         element={<PrivacyPolicy />} />

        {/* Owner — standalone printable pages (no sidebar layout) */}
        <Route path="/owner/agreement/:leaseId" element={<OwnerRoute><Agreement /></OwnerRoute>} />

        {/* Owner */}
        <Route element={<OwnerRoute><DashboardLayout /></OwnerRoute>}>
          <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="/owner/dashboard"   element={<Dashboard />} />
          <Route path="/owner/stores"      element={<Stores />} />
          <Route path="/owner/tenants"     element={<Tenants />} />
          <Route path="/owner/payments"    element={<Payments />} />
          <Route path="/owner/reports"     element={<Reports />} />
          <Route path="/owner/maintenance" element={<Maintenance />} />
          <Route path="/owner/map"         element={<MapView />} />
          <Route path="/owner/enquiries"   element={<Enquiries />} />
          <Route path="/owner/settings"    element={<Settings />} />
        </Route>

        {/* Tenant */}
        <Route element={<TenantRoute><TenantLayout /></TenantRoute>}>
          <Route path="/tenant"             element={<TenantHome />} />
          <Route path="/tenant/pay"         element={<PayRent />} />
          <Route path="/tenant/receipts"    element={<Receipts />} />
          <Route path="/tenant/maintenance" element={<TenantMaintenance />} />
          <Route path="/tenant/profile"     element={<TenantProfile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
