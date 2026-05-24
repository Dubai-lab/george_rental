import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useFxRate, toLrd } from '@/hooks/useFxRate'
import { useAuth } from '@/contexts/AuthContext'
import { Lease, PaymentMethod } from '@/types'
import Btn from '@/components/ui/Btn'
import Pill from '@/components/ui/Pill'
import { IconClose, IconCheck, IconCalendar, IconUpload, IconMail, IconArrow } from '@/components/ui/Icons'

interface Props { onClose: () => void }

type Step = 1 | 2 | 3
type FormValues = {
  lease_id:        string
  amount_usd:      number
  method:          PaymentMethod
  transaction_ref: string
  payment_date:    string
  notes:           string
  send_email:      boolean
}

export default function RecordPaymentModal({ onClose }: Props) {
  const [step, setStep]     = useState<Step>(1)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUrl, setProofUrl]   = useState<string | null>(null)
  const { profile } = useAuth()
  const { data: fxRate = 180 } = useFxRate()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      method:       'mtn_momo',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      send_email:   true,
      amount_usd:   0,
    },
  })

  const method    = watch('method')
  const amountUsd = watch('amount_usd') ?? 0
  const leaseId   = watch('lease_id')
  const amountLrd = toLrd(Number(amountUsd), fxRate)

  // Load active leases
  const { data: leases = [] } = useQuery({
    queryKey: ['leases-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('*, tenant:profiles(*), store:stores(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      return (data ?? []) as (Lease & { tenant: any; store: any })[]
    },
  })

  const selectedLease = leases.find(l => l.id === leaseId)

  // Pre-fill amount when lease is selected
  function onLeaseChange(id: string) {
    setValue('lease_id', id)
    const lease = leases.find(l => l.id === id)
    if (lease) setValue('amount_usd', lease.monthly_rent_usd)
  }

  // Upload proof file
  async function uploadProof(file: File): Promise<string> {
    const ext  = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('payment-proofs').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path)
    return data.publicUrl
  }

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let proof_url = proofUrl
      if (proofFile && !proof_url) proof_url = await uploadProof(proofFile)

      const lease = leases.find(l => l.id === values.lease_id)
      if (!lease) throw new Error('No lease selected')

      const { error } = await supabase.from('payments').insert({
        lease_id:        values.lease_id,
        tenant_id:       lease.tenant_id,
        store_id:        lease.store_id,
        amount_usd:      Number(values.amount_usd),
        amount_lrd:      amountLrd,
        fx_rate:         fxRate,
        method:          values.method,
        period_month:    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        transaction_ref: values.transaction_ref || null,
        proof_url,
        status:          'pending',
        notes:           values.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onClose()
    },
  })

  const methodOptions = [
    { id: 'mtn_momo',      label: 'MTN MoMo',       sub: '+231 88 658 8543',     bg: '#FFCC00', fg: '#0B1A3D', logo: 'MTN'  },
    { id: 'bank_transfer', label: 'Bank transfer',   sub: 'Acct · 111 222 333 4445', bg: '#0B1A3D', fg: '#fff',    logo: 'LBDI' },
    { id: 'cash',          label: 'Cash',             sub: 'Paid in person',      bg: '#FBF7EC', fg: '#0B1A3D', logo: '$'    },
  ]

  function StepIndicator() {
    const steps = ['Method', 'Proof', 'Confirm']
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
        {steps.map((label, i) => {
          const n       = (i + 1) as Step
          const done    = step > n
          const active  = step === n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && <span style={{ flex: 1, height: 1, width: 40, background: done ? 'var(--gr-mint)' : 'var(--gr-line)' }} />}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 99,
                  background: done ? 'var(--gr-mint)' : active ? 'var(--gr-navy)' : '#fff',
                  border: !done && !active ? '1px solid var(--gr-line)' : 'none',
                  color: done || active ? '#fff' : 'var(--gr-stone-2)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {done ? <IconCheck size={12} stroke="#fff" /> : n}
                </span>
                <span style={{ fontWeight: active ? 600 : 500, color: active ? 'var(--gr-ink)' : 'var(--gr-stone-2)' }}>{label}</span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,20,0.45)', backdropFilter: 'blur(2px)', zIndex: 40 }}
      />

      {/* Sheet */}
      <motion.aside
        key="sheet"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 760,
          background: '#fff', boxShadow: '-40px 0 80px rgba(6,9,20,0.35)',
          display: 'flex', flexDirection: 'column', zIndex: 50,
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--gr-line)', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Record payment</div>
            {selectedLease ? (
              <>
                <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, color: 'var(--gr-ink)' }}>
                  {selectedLease.tenant?.full_name} · {selectedLease.store?.name}
                </h2>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--gr-stone-2)' }}>
                  <Pill tone="gold">Period: {format(new Date(), 'MMM yyyy')}</Pill>
                  <span>{selectedLease.business_type}</span>
                  <span style={{ fontFamily: 'var(--f-mono)' }}>Lease {selectedLease.lease_code}</span>
                </div>
              </>
            ) : (
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', marginTop: 6 }}>
                Select a tenant below
              </h2>
            )}
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--gr-line)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <IconClose size={16} stroke="var(--gr-stone)" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(v => mutation.mutate(v))} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>

            <StepIndicator />

            {/* Lease selector */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-stone)', display: 'block', marginBottom: 8 }}>Select tenant / store</label>
              <select
                {...register('lease_id', { required: true })}
                onChange={e => onLeaseChange(e.target.value)}
                style={{
                  width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                  border: `1px solid ${errors.lease_id ? 'var(--gr-crimson)' : 'var(--gr-line)'}`,
                  background: '#fff', fontSize: 14, color: 'var(--gr-ink)',
                }}
              >
                <option value="">— choose —</option>
                {leases.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.tenant?.full_name} · {l.store?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Method picker */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-stone)', marginBottom: 10 }}>Payment method</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {methodOptions.map(opt => {
                  const sel = method === opt.id
                  return (
                    <label key={opt.id} style={{
                      padding: 16, borderRadius: 12, background: '#fff', cursor: 'pointer',
                      border: sel ? '2px solid var(--gr-crimson)' : '1px solid var(--gr-line)',
                      position: 'relative', display: 'block',
                    }}>
                      <input type="radio" value={opt.id} {...register('method')} style={{ display: 'none' }} />
                      {sel && (
                        <span style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: 99, background: 'var(--gr-crimson)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconCheck size={11} stroke="#fff" />
                        </span>
                      )}
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: opt.bg, color: opt.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 12 }}>
                        {opt.logo}
                      </div>
                      <div style={{ marginTop: 10, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, color: 'var(--gr-ink)' }}>{opt.label}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gr-stone-2)', fontFamily: opt.id === 'bank_transfer' ? 'var(--f-mono)' : 'inherit' }}>{opt.sub}</div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Amount paid · USD" suffix="$">
                <input
                  type="number" step="0.01"
                  {...register('amount_usd', { required: true, min: 1 })}
                  style={fieldInput}
                />
              </Field>
              <Field label="Equivalent · LRD" suffix="L$" hint={`@ L$${fxRate}/USD`} muted>
                <input value={amountLrd.toLocaleString()} readOnly style={{ ...fieldInput, background: 'var(--gr-paper)', color: 'var(--gr-stone)' }} />
              </Field>
              {method === 'mtn_momo' && (
                <Field label="MTN transaction ID">
                  <input {...register('transaction_ref')} placeholder="MP240523.1742" style={{ ...fieldInput, fontFamily: 'var(--f-mono)' }} />
                </Field>
              )}
              {method === 'bank_transfer' && (
                <Field label="Bank reference">
                  <input {...register('transaction_ref')} placeholder="Reference #" style={{ ...fieldInput, fontFamily: 'var(--f-mono)' }} />
                </Field>
              )}
              <Field label="Payment date" icon={<IconCalendar size={14} stroke="var(--gr-stone-2)" />}>
                <input type="date" {...register('payment_date')} style={fieldInput} />
              </Field>
            </div>

            {/* Proof upload */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-stone)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>Proof of payment <span style={{ color: 'var(--gr-crimson)' }}>*</span></span>
                <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--gr-stone-2)' }}>Screenshot or SMS · PDF accepted</span>
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                border: `1.5px dashed ${proofFile ? 'var(--gr-mint)' : 'rgba(11,26,61,0.18)'}`,
                borderRadius: 12, background: 'var(--gr-paper)', cursor: 'pointer',
              }}>
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setProofFile(f); setProofUrl(null) }
                  }} />
                <span style={{ width: 44, height: 44, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {proofFile
                    ? <IconCheck size={20} stroke="var(--gr-mint)" />
                    : <IconUpload size={20} stroke="var(--gr-ink)" />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {proofFile ? (
                    <>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proofFile.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 4 }}>{(proofFile.size / 1024).toFixed(0)} KB · ready to upload</div>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gr-mint)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconCheck size={13} stroke="var(--gr-mint)" /> Proof attached
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Upload proof of payment</div>
                      <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>Screenshot of MTN SMS, bank slip, or photo</div>
                    </>
                  )}
                </div>
                {proofFile && (
                  <button type="button" onClick={e => { e.preventDefault(); setProofFile(null) }}
                    style={{ fontSize: 12, color: 'var(--gr-stone-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </label>
            </div>

            {/* Receipt delivery */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-stone)', marginBottom: 10 }}>Receipt delivery</div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                border: '1px solid var(--gr-line)', borderRadius: 10, background: '#fff', cursor: 'pointer',
              }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gr-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconMail size={14} stroke="var(--gr-ink)" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Email receipt to tenant</div>
                  <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 1 }}>{selectedLease?.tenant?.email ?? 'email on file'}</div>
                </div>
                <input type="checkbox" {...register('send_email')} style={{ width: 16, height: 16, accentColor: 'var(--gr-mint)' }} />
              </label>
            </div>

            {/* Notes */}
            <Field label="Notes (optional)">
              <textarea {...register('notes')} rows={2}
                placeholder="Any additional context…"
                style={{ ...fieldInput, height: 'auto', padding: '10px 14px', resize: 'vertical' }} />
            </Field>

          </div>

          {/* Footer */}
          <div style={{ padding: '18px 32px', borderTop: '1px solid var(--gr-line)', background: 'var(--gr-paper)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Will be saved</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', fontVariantNumeric: 'tabular-nums' }}>
                  ${Number(amountUsd).toLocaleString()}
                </span>
                <span style={{ fontSize: 14, color: 'var(--gr-stone-2)', fontVariantNumeric: 'tabular-nums' }}>
                  L${amountLrd.toLocaleString()}
                </span>
              </div>
            </div>
            <Btn kind="ghost" type="button" onClick={onClose}>Cancel</Btn>
            <Btn kind="crimson" type="submit" loading={mutation.isPending} iconRight={<IconArrow size={15} stroke="#fff" />}>
              Save as pending
            </Btn>
          </div>
        </form>
      </motion.aside>
    </>
  )
}

// ── Field helper ──────────────────────────────────────────────
function Field({ label, suffix, hint, muted, icon, children }: {
  label: string; suffix?: string; hint?: string; muted?: boolean; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && <span style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}>{icon}</span>}
        <div style={{ flex: 1 }}>{children}</div>
        {suffix && (
          <span style={{ position: 'absolute', right: 14, fontSize: 13, color: 'var(--gr-stone-2)', fontWeight: 500, pointerEvents: 'none' }}>{suffix}</span>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

const fieldInput: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 14px',
  borderRadius: 10, border: '1px solid var(--gr-line)',
  background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none',
}
