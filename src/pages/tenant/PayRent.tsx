import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { format, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useFxRate, toLrd as toLrdFn } from '@/hooks/useFxRate'
import { Lease, Store } from '@/types'
import Btn from '@/components/ui/Btn'
import { IconCheck, IconUpload, IconCopy } from '@/components/ui/Icons'

type TenantLease = Lease & { store: Store }

type FormValues = {
  period_month: string
  transaction_ref: string
  notes: string
}

type Method = 'mtn_momo' | 'bank_transfer'

interface BankAccount { bank: string; account: string; name: string }
interface PaySettings { momo_number: string; momo_name: string; banks: BankAccount[] }

function usePaySettings() {
  return useQuery<PaySettings | null>({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_settings').select('momo_number,momo_name,banks').maybeSingle()
      return data as PaySettings | null
    },
    staleTime: 300_000,
  })
}

function useTenantLease(userId: string | undefined) {
  return useQuery<TenantLease | null>({
    queryKey: ['tenant-lease', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('*, store:stores(*)')
        .eq('tenant_id', userId!)
        .eq('status', 'active')
        .maybeSingle()
      return data as TenantLease | null
    },
  })
}

const MONTHS = Array.from({ length: 4 }, (_, i) => {
  const d   = subMonths(new Date(), i)
  const key = format(d, 'yyyy-MM')
  return { key, label: format(d, 'MMMM yyyy') }
})

export default function PayRent() {
  const { profile } = useAuth()
  const { data: fxRate = 180 } = useFxRate()
  const toLrd = (usd: number) => toLrdFn(usd, fxRate)
  const { data: lease } = useTenantLease(profile?.id)
  const { data: paySettings } = usePaySettings()

  const momoNumber = paySettings?.momo_number ?? '088 605 5575'
  const momoName   = paySettings?.momo_name   ?? 'George Rental'
  const bankList   = paySettings?.banks ?? []

  const [step, setStep]     = useState<1 | 2 | 3>(1)
  const [method, setMethod] = useState<Method>('mtn_momo')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [done, setDone]     = useState(false)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { period_month: MONTHS[0].key },
  })

  const submitMut = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!lease || !profile) throw new Error('No active lease')
      const amountUsd = lease.monthly_rent_usd
      const amountLrd = toLrd(amountUsd)

      let proofUrl: string | null = null
      if (proofFile) {
        const ext  = proofFile.name.split('.').pop()
        const path = `${profile.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, proofFile)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(path)
        proofUrl = publicUrl
      }

      const { error } = await supabase.from('payments').insert({
        lease_id:        lease.id,
        tenant_id:       profile.id,
        store_id:        lease.store_id,
        amount_usd:      amountUsd,
        amount_lrd:      amountLrd,
        fx_rate:         fxRate,
        method,
        period_month:    values.period_month,
        transaction_ref: values.transaction_ref || null,
        proof_url:       proofUrl,
        notes:           values.notes || null,
        status:          'pending',
      })
      if (error) throw error
    },
    onSuccess: () => setDone(true),
  })

  function copyMtn() {
    navigator.clipboard.writeText(momoNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!lease) return (
    <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No active lease</div>
      <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 6 }}>You don't have an active lease to pay for.</div>
    </div>
  )

  if (done) return (
    <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{
          width: 72, height: 72, borderRadius: 99, background: 'rgba(47,184,117,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}
      >
        <IconCheck size={36} stroke="var(--gr-mint)" />
      </motion.div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>Payment Submitted!</div>
      <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 8, lineHeight: 1.6 }}>
        Your payment is pending review.<br />You'll be notified once it's confirmed.
      </div>
      <Btn kind="crimson" style={{ marginTop: 28 }} onClick={() => { setDone(false); setStep(1); setProofFile(null) }}>
        Submit another
      </Btn>
    </div>
  )

  const amountUsd = lease.monthly_rent_usd
  const amountLrd = toLrd(amountUsd)

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        {(['Method', 'Proof', 'Confirm'] as const).map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3
          const active = step === s
          const done   = step > s
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 99,
                  background: done ? 'var(--gr-mint)' : active ? 'var(--gr-crimson)' : 'var(--gr-line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <IconCheck size={12} stroke="#fff" />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--gr-stone-2)' }}>{s}</span>
                  }
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--gr-ink)' : 'var(--gr-stone-2)' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: done ? 'var(--gr-mint)' : 'var(--gr-line)' }} />}
            </div>
          )
        })}
      </div>

      {/* Amount card */}
      <div style={{
        background: 'var(--gr-midnight)', borderRadius: 16, padding: '20px 22px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', marginBottom: 4 }}>{lease.store.name} · {format(new Date(), 'MMMM yyyy')}</div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700, color: '#fff' }}>${amountUsd.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.45)', marginTop: 2 }}>L${amountLrd.toLocaleString()}</div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — Method */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 14 }}>Choose payment method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {([
                { id: 'mtn_momo', label: 'MTN Mobile Money', sub: 'Instant — most popular', badge: 'MTN', badgeColor: '#FFC107' },
                { id: 'bank_transfer', label: 'Bank Transfer', sub: 'LBDI · Ecobank · UBA', badge: 'BANK', badgeColor: 'var(--gr-navy)' },
              ] as { id: Method; label: string; sub: string; badge: string; badgeColor: string }[]).map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 14, border: `2px solid ${method === m.id ? 'var(--gr-crimson)' : 'var(--gr-line)'}`,
                  background: method === m.id ? 'rgba(209,31,44,0.04)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="radio" style={{ display: 'none' }} checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: m.badgeColor + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: m.badge.startsWith('💵') ? 20 : 10, fontWeight: 800, color: m.badgeColor, letterSpacing: '-0.03em',
                  }}>{m.badge}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gr-ink)' }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: 99, border: `2px solid ${method === m.id ? 'var(--gr-crimson)' : 'var(--gr-line)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {method === m.id && <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--gr-crimson)' }} />}
                  </div>
                </label>
              ))}
            </div>
            <Btn kind="crimson" style={{ width: '100%' }} onClick={() => setStep(2)}>
              Continue →
            </Btn>
          </motion.div>
        )}

        {/* Step 2 — Proof */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* MTN instruction */}
            {method === 'mtn_momo' && (
              <div style={{
                background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.3)',
                borderRadius: 14, padding: '16px 18px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>Send to MTN MoMo</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>{momoName}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)', marginTop: 4 }}>{momoNumber}</div>
                  </div>
                  <button type="button" onClick={copyMtn} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                    borderRadius: 8, border: '1px solid rgba(255,193,7,0.4)', background: 'none',
                    cursor: 'pointer', fontSize: 12, color: copied ? 'var(--gr-mint)' : 'var(--gr-ink)', fontWeight: 500,
                  }}>
                    <IconCopy size={13} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255,193,7,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.5 }}>
                  Send <strong style={{ color: 'var(--gr-ink)' }}>L${amountLrd.toLocaleString()}</strong> and enter the transaction ID below.
                </div>
              </div>
            )}

            {/* Bank details */}
            {method === 'bank_transfer' && (
              <div style={{
                background: 'rgba(11,26,61,0.05)', border: '1px solid var(--gr-line)',
                borderRadius: 14, padding: '16px 18px', marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 12 }}>Bank Account Details</div>
                {bankList.map(b => (
                  <div key={b.bank} style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gr-navy)' }}>{b.bank}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gr-ink)', marginLeft: 10 }}>{b.account}</span>
                    {b.name && <span style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginLeft: 6 }}>· {b.name}</span>}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit(v => { setStep(3) })} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Period */}
              <div>
                <label style={labelStyle}>Payment period</label>
                <select {...register('period_month')} style={inputStyle}>
                  {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>

              {/* Ref */}
              <div>
                <label style={labelStyle}>{method === 'mtn_momo' ? 'MTN Transaction ID' : 'Bank Reference'}</label>
                <input
                  placeholder={method === 'mtn_momo' ? 'e.g. 1234567890' : 'e.g. TRF2025XXXX'}
                  {...register('transaction_ref')}
                  style={inputStyle}
                />
              </div>

              {/* Proof upload */}
              <div>
                <label style={labelStyle}>Upload proof (screenshot / receipt)</label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  borderRadius: 10, border: `2px dashed ${proofFile ? 'var(--gr-mint)' : 'var(--gr-line)'}`,
                  cursor: 'pointer', background: proofFile ? 'rgba(47,184,117,0.04)' : '#fff',
                  transition: 'all 0.15s',
                }}>
                  <IconUpload size={16} stroke={proofFile ? 'var(--gr-mint)' : 'var(--gr-stone-2)'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: proofFile ? 'var(--gr-mint)' : 'var(--gr-ink)' }}>
                      {proofFile ? proofFile.name : 'Choose file…'}
                    </div>
                    {!proofFile && <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>PNG, JPG, PDF up to 5 MB</div>}
                  </div>
                  <input
                    type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                    onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</Btn>
                <Btn kind="crimson" type="submit" style={{ flex: 2 }}>Review →</Btn>
              </div>
            </form>
          </motion.div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 16 }}>Confirm your payment</div>
            <div style={{ background: 'var(--gr-paper)', borderRadius: 14, padding: '18px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Amount (USD)', value: `$${amountUsd.toLocaleString()}` },
                { label: 'Amount (LRD)', value: `L$${amountLrd.toLocaleString()}` },
                { label: 'Method', value: method === 'mtn_momo' ? 'MTN Mobile Money' : 'Bank Transfer' },
                { label: 'Proof', value: proofFile ? proofFile.name : 'None uploaded' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</Btn>
              <Btn
                kind="crimson" style={{ flex: 2 }}
                loading={submitMut.isPending}
                onClick={() => handleSubmit(v => submitMut.mutate(v))()}
              >
                Submit payment
              </Btn>
            </div>
            {submitMut.isError && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gr-crimson)', textAlign: 'center' }}>
                {(submitMut.error as Error).message}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gr-stone)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--gr-line)', background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none' }
