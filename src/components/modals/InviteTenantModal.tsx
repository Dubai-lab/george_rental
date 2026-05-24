import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Store } from '@/types'
import Btn from '@/components/ui/Btn'
import { IconClose, IconUserPlus } from '@/components/ui/Icons'

interface Props { onClose: () => void; onSuccess?: () => void }
type FormValues = {
  email:         string
  full_name:     string
  store_id:      string
  business_name: string
  business_type: string
  start_date:    string
}

export default function InviteTenantModal({ onClose, onSuccess }: Props) {
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { start_date: new Date().toISOString().slice(0, 10) },
  })

  const storeId = watch('store_id')

  // Vacant stores only
  const { data: stores = [] } = useQuery({
    queryKey: ['vacant-stores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('*, area:areas(name)')
        .eq('status', 'vacant')
        .order('name')
      return (data ?? []) as (Store & { area: { name: string } | null })[]
    },
  })

  const selectedStore = stores.find(s => s.id === storeId)

  async function onSubmit(values: FormValues) {
    setError(null)
    const store = stores.find(s => s.id === values.store_id)
    if (!store) { setError('Please select a store.'); return }

    const { error: err } = await supabase.functions.invoke('send-tenant-invite', {
      body: {
        email:         values.email,
        full_name:     values.full_name,
        store_id:      values.store_id,
        store_name:    store.name,
        store_code:    store.code,
        store_area:    store.area?.name ?? '',
        rent_usd:      store.rent_usd,
        business_name: values.business_name,
        business_type: values.business_type,
        start_date:    values.start_date,
      },
    })

    if (err) { setError(err.message); return }
    setSent(true)
    onSuccess?.()
  }

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(6,9,20,0.45)', backdropFilter: 'blur(2px)', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          overflowY: 'auto',
        }}
      >
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, background: '#fff', borderRadius: 18,
          boxShadow: '0 40px 80px rgba(6,9,20,0.35)',
          zIndex: 50, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 48px)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gr-line)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(209,31,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconUserPlus size={20} stroke="var(--gr-crimson)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 18, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>Invite tenant</div>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>Send an invite link · they set their password on sign-in</div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--gr-line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <IconClose size={14} stroke="var(--gr-stone)" />
          </button>
        </div>

        {sent ? (
          <div style={{ padding: 40, textAlign: 'center', overflowY: 'auto', flex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: 'rgba(47,184,117,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2FB875" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l4.5 4.5L20 6"/></svg>
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-ink)' }}>Invite sent!</div>
            <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 8 }}>The tenant will receive an email with a link to set up their account.</div>
            <Btn kind="primary" style={{ marginTop: 24, width: '100%' }} onClick={onClose}>Done</Btn>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '22px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)', color: 'var(--gr-crimson)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InField label="Full name" required>
                <input {...register('full_name', { required: true })} placeholder="Mariama Kollie" style={inp} />
              </InField>
              <InField label="Email address" required>
                <input {...register('email', { required: true })} type="email" placeholder="tenant@email.com" style={inp} />
              </InField>
            </div>

            <InField label="Assign store" required>
              <select {...register('store_id', { required: true })} style={inp}>
                <option value="">— select vacant store —</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · ${s.rent_usd}/mo</option>
                ))}
              </select>
              {selectedStore && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gr-stone-2)' }}>
                  {selectedStore.area?.name} · ${selectedStore.rent_usd}/month
                </div>
              )}
            </InField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InField label="Business name">
                <input {...register('business_name')} placeholder="Mariama Tailoring" style={inp} />
              </InField>
              <InField label="Business type">
                <input {...register('business_type')} placeholder="Tailoring, Salon…" style={inp} />
              </InField>
            </div>

            <InField label="Lease start date">
              <input type="date" {...register('start_date')} style={inp} />
            </InField>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <Btn kind="ghost" type="button" style={{ flex: 1 }} onClick={onClose}>Cancel</Btn>
              <Btn kind="crimson" type="submit" loading={isSubmitting} style={{ flex: 1 }}>
                Send invite
              </Btn>
            </div>
          </form>
        )}
      </motion.div>
      </motion.div>
    </>
  )
}

function InField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gr-stone-2)', display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--gr-crimson)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
  border: '1px solid var(--gr-line)', background: '#fff',
  fontSize: 14, color: 'var(--gr-ink)', outline: 'none',
}
