import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { format, addMonths, subMonths, parseISO, setDate, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useFxRate, toLrd as toLrdFn } from '@/hooks/useFxRate'
import { Lease, Store } from '@/types'
import Btn from '@/components/ui/Btn'
import { IconCheck, IconUpload, IconCopy } from '@/components/ui/Icons'

type TenantLease = Lease & { store: Store }
type FormValues  = { period_month: string; transaction_ref: string; notes: string }
type Method      = 'mtn_momo' | 'bank_transfer'
interface BankAccount { bank: string; account: string; name: string }
interface PaySettings { momo_number: string; momo_name: string; banks: BankAccount[] }

// ── Billing helpers (all anchored to dueDay of month) ────────────────────────
// e.g. dueDay=24, period "2026-05", 6 months → May 24 – Nov 23, next due Nov 24

function billingStartDate(periodMonth: string, dueDay: number): Date {
  return setDate(parseISO(periodMonth + '-01'), dueDay)
}

function billingEndDate(periodMonth: string, monthsCount: number, dueDay: number): Date {
  const nextDue = setDate(addMonths(parseISO(periodMonth + '-01'), monthsCount), dueDay)
  return subDays(nextDue, 1)
}

function nextDueDateFor(periodMonth: string, monthsCount: number, dueDay: number): Date {
  return setDate(addMonths(parseISO(periodMonth + '-01'), monthsCount), dueDay)
}

export function periodRangeLabel(periodMonth: string, monthsCount: number, dueDay?: number | null): string {
  if (!dueDay) {
    if (monthsCount <= 1) return format(parseISO(periodMonth + '-01'), 'MMMM yyyy')
    const s = parseISO(periodMonth + '-01')
    return `${format(s, 'MMM')} – ${format(addMonths(s, monthsCount - 1), 'MMM yyyy')} (${monthsCount} months)`
  }
  const start = billingStartDate(periodMonth, dueDay)
  const end   = billingEndDate(periodMonth, monthsCount, dueDay)
  if (monthsCount <= 1) return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')} (${monthsCount} months)`
}

// Next period_month key after last confirmed payment
function nextPeriodMonth(lastPeriodMonth: string, lastMonthsCount: number): string {
  return format(addMonths(parseISO(lastPeriodMonth + '-01'), lastMonthsCount), 'yyyy-MM')
}

// ── Data hooks ────────────────────────────────────────────────────────────────

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

function useLastConfirmedPayment(userId: string | undefined) {
  return useQuery<{ period_month: string; months_count: number } | null>({
    queryKey: ['last-payment', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('period_month, months_count')
        .eq('tenant_id', userId!)
        .eq('status', 'confirmed')
        .order('period_month', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data as { period_month: string; months_count: number } | null
    },
    staleTime: 30_000,
  })
}

function buildMonthsList(ensureMonth?: string) {
  const months = [
    addMonths(new Date(), 3),
    addMonths(new Date(), 2),
    addMonths(new Date(), 1),
    new Date(),
    subMonths(new Date(), 1),
    subMonths(new Date(), 2),
  ].map(d => ({ key: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') }))
  if (ensureMonth && !months.find(m => m.key === ensureMonth)) {
    months.unshift({ key: ensureMonth, label: format(parseISO(ensureMonth + '-01'), 'MMMM yyyy') })
  }
  return months
}

const MONTH_PRESETS = [1, 2, 3, 6, 12]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PayRent() {
  const { profile } = useAuth()
  const { data: fxRate = 180 }  = useFxRate()
  const toLrd = (usd: number)   => toLrdFn(usd, fxRate)
  const { data: lease }         = useTenantLease(profile?.id)
  const { data: paySettings }   = usePaySettings()
  const { data: lastPayment }   = useLastConfirmedPayment(profile?.id)

  const momoNumber = paySettings?.momo_number ?? '088 605 5575'
  const momoName   = paySettings?.momo_name   ?? 'George Rental'
  const bankList   = paySettings?.banks ?? []

  // dueDay is anchored to lease start date (e.g. 24)
  const dueDay = lease?.start_date ? new Date(lease.start_date).getDate() : null

  // Default to next unpaid period, or first month of lease
  const defaultPeriod = lastPayment
    ? nextPeriodMonth(lastPayment.period_month, lastPayment.months_count)
    : (lease?.start_date ? format(parseISO(lease.start_date), 'yyyy-MM') : format(new Date(), 'yyyy-MM'))

  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [method,      setMethod]      = useState<Method>('mtn_momo')
  const [monthsCount, setMonthsCount] = useState(1)
  const [proofFile,   setProofFile]   = useState<File | null>(null)
  const [done,        setDone]        = useState(false)
  const [copied,      setCopied]      = useState(false)

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: { period_month: defaultPeriod },
  })
  const startMonth = watch('period_month')

  // Sync form once lease + lastPayment load
  const [synced, setSynced] = useState(false)
  if (lease && lastPayment !== undefined && !synced) {
    const period = lastPayment
      ? nextPeriodMonth(lastPayment.period_month, lastPayment.months_count)
      : format(parseISO(lease.start_date), 'yyyy-MM')
    setValue('period_month', period)
    setSynced(true)
  }

  const MONTHS      = buildMonthsList(defaultPeriod)
  const monthlyRent = lease?.monthly_rent_usd ?? 0
  const totalUsd    = monthlyRent * monthsCount
  const totalLrd    = toLrd(totalUsd)

  // What the selected period covers (for display in amount card + confirm)
  const coverageLabel = periodRangeLabel(startMonth, monthsCount, dueDay)

  // Banner data
  const paidThrough = lastPayment && dueDay
    ? billingEndDate(lastPayment.period_month, lastPayment.months_count, dueDay)
    : null
  const nextDue = lastPayment && dueDay
    ? nextDueDateFor(lastPayment.period_month, lastPayment.months_count, dueDay)
    : (lease?.start_date && dueDay ? parseISO(lease.start_date) : null)

  // Reminder hint for multi-month
  const noReminderUntil = dueDay
    ? nextDueDateFor(startMonth, monthsCount, dueDay)
    : addMonths(parseISO(startMonth + '-01'), monthsCount)

  const submitMut = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!lease || !profile) throw new Error('No active lease')
      let proofUrl: string | null = null
      if (proofFile) {
        const ext  = proofFile.name.split('.').pop()
        const path = `${profile.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, proofFile)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(path)
        proofUrl = publicUrl
      }
      const { data: inserted, error } = await supabase.from('payments').insert({
        lease_id:        lease.id,
        tenant_id:       profile.id,
        store_id:        lease.store_id,
        amount_usd:      totalUsd,
        amount_lrd:      totalLrd,
        fx_rate:         fxRate,
        method,
        period_month:    values.period_month,
        months_count:    monthsCount,
        due_day:         dueDay,
        transaction_ref: values.transaction_ref || null,
        proof_url:       proofUrl,
        notes:           values.notes || null,
        status:          'pending',
      }).select('id').single()
      if (error) throw error
      if (inserted?.id) {
        supabase.functions.invoke('notify-payment', { body: { payment_id: inserted.id, action: 'submitted' } }).catch(() => {})
      }
    },
    onSuccess: () => setDone(true),
  })

  function copyMtn() {
    navigator.clipboard.writeText(momoNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setDone(false); setStep(1); setProofFile(null); setMonthsCount(1)
    setSynced(false)
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
        style={{ width: 72, height: 72, borderRadius: 99, background: 'rgba(47,184,117,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}
      >
        <IconCheck size={36} stroke="var(--gr-mint)" />
      </motion.div>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>Payment Submitted!</div>
      <div style={{ fontSize: 14, color: 'var(--gr-stone-2)', marginTop: 8, lineHeight: 1.6 }}>
        Your payment is pending review.<br />You'll be notified once it's confirmed.
      </div>
      <Btn kind="crimson" style={{ marginTop: 28 }} onClick={reset}>Submit another</Btn>
    </div>
  )

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        {(['Method', 'Proof', 'Confirm'] as const).map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3
          const active = step === s, isDone = step > s
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 99, background: isDone ? 'var(--gr-mint)' : active ? 'var(--gr-crimson)' : 'var(--gr-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isDone ? <IconCheck size={12} stroke="#fff" /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--gr-stone-2)' }}>{s}</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--gr-ink)' : 'var(--gr-stone-2)' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: isDone ? 'var(--gr-mint)' : 'var(--gr-line)' }} />}
            </div>
          )
        })}
      </div>

      {/* Amount card */}
      <div style={{ background: 'var(--gr-midnight)', borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'rgba(246,241,228,0.5)', marginBottom: 6 }}>
          {lease.store.name} · {coverageLabel}
        </div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 30, fontWeight: 700, color: '#fff' }}>
          ${totalUsd.toLocaleString()}
        </div>
        {monthsCount > 1 && (
          <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.55)', marginTop: 3 }}>
            {monthsCount} × ${monthlyRent.toLocaleString()}/mo
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(246,241,228,0.4)', marginTop: 2 }}>L${totalLrd.toLocaleString()}</div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1 — Method + Months ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

            {/* Billing status banner */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12, marginBottom: 20,
              background: paidThrough ? 'rgba(47,184,117,0.08)' : 'rgba(11,26,61,0.05)',
              border: `1px solid ${paidThrough ? 'rgba(47,184,117,0.25)' : 'var(--gr-line)'}`,
            }}>
              <span style={{ fontSize: 16 }}>{paidThrough ? '✅' : '📅'}</span>
              <div>
                {paidThrough ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-mint)' }}>
                      Rent paid through {format(paidThrough, 'MMMM d, yyyy')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 3 }}>
                      Next rent due: <strong style={{ color: 'var(--gr-ink)' }}>{nextDue ? format(nextDue, 'MMMM d, yyyy') : '—'}</strong>
                      {' '}— choose how many months to pay below.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>
                      Rent is due on the {dueDay ?? '—'}{ordinal(dueDay)} of each month
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 3 }}>
                      Your first payment starts{' '}
                      <strong style={{ color: 'var(--gr-ink)' }}>
                        {nextDue ? format(nextDue, 'MMMM d, yyyy') : '—'}
                      </strong>.
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Months selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 12 }}>How many months?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {MONTH_PRESETS.map(n => (
                  <button
                    type="button" key={n}
                    onClick={() => setMonthsCount(n)}
                    style={{
                      flex: 1, height: 44, borderRadius: 10,
                      border: `2px solid ${monthsCount === n ? 'var(--gr-crimson)' : 'var(--gr-line)'}`,
                      background: monthsCount === n ? 'rgba(209,31,44,0.06)' : '#fff',
                      color: monthsCount === n ? 'var(--gr-crimson)' : 'var(--gr-stone)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {n === 12 ? '1 yr' : `${n} mo`}
                  </button>
                ))}
              </div>
              {monthsCount >= 3 && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(47,184,117,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gr-mint)', fontWeight: 500 }}>
                  ✓ Covers {monthsCount} months — next rent due <strong>{format(noReminderUntil, 'MMMM d, yyyy')}</strong>
                </div>
              )}
            </div>

            {/* Method selector */}
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 12 }}>Payment method</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {([
                { id: 'mtn_momo',      label: 'MTN Mobile Money', sub: 'Instant — most popular', badge: 'MTN',  badgeColor: '#FFC107' },
                { id: 'bank_transfer', label: 'Bank Transfer',     sub: 'LBDI · Ecobank · UBA',  badge: 'BANK', badgeColor: 'var(--gr-navy)' },
              ] as { id: Method; label: string; sub: string; badge: string; badgeColor: string }[]).map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 14, border: `2px solid ${method === m.id ? 'var(--gr-crimson)' : 'var(--gr-line)'}`,
                  background: method === m.id ? 'rgba(209,31,44,0.04)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="radio" style={{ display: 'none' }} checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: m.badgeColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: m.badgeColor }}>{m.badge}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gr-ink)' }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${method === m.id ? 'var(--gr-crimson)' : 'var(--gr-line)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {method === m.id && <div style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--gr-crimson)' }} />}
                  </div>
                </label>
              ))}
            </div>
            <Btn kind="crimson" style={{ width: '100%' }} onClick={() => setStep(2)}>Continue →</Btn>
          </motion.div>
        )}

        {/* ── Step 2 — Proof ── */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {method === 'mtn_momo' && (
              <div style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 10 }}>Send to MTN MoMo</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>{momoName}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)', marginTop: 4 }}>{momoNumber}</div>
                  </div>
                  <button type="button" onClick={copyMtn} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,193,7,0.4)', background: 'none', cursor: 'pointer', fontSize: 12, color: copied ? 'var(--gr-mint)' : 'var(--gr-ink)', fontWeight: 500 }}>
                    <IconCopy size={13} />{copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255,193,7,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.5 }}>
                  Send <strong style={{ color: 'var(--gr-ink)' }}>L${totalLrd.toLocaleString()}</strong> and enter the transaction ID below.
                </div>
              </div>
            )}
            {method === 'bank_transfer' && (
              <div style={{ background: 'rgba(11,26,61,0.05)', border: '1px solid var(--gr-line)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
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

            <form onSubmit={handleSubmit(() => setStep(3))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Starting period</label>
                <select {...register('period_month')} style={inputStyle}>
                  {MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                {dueDay && (
                  <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 5 }}>
                    Covers {format(billingStartDate(startMonth, dueDay), 'MMM d')} – {format(billingEndDate(startMonth, monthsCount, dueDay), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>{method === 'mtn_momo' ? 'MTN Transaction ID' : 'Bank Reference'}</label>
                <input placeholder={method === 'mtn_momo' ? 'e.g. 1234567890' : 'e.g. TRF2025XXXX'} {...register('transaction_ref')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Upload proof (screenshot / receipt)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: `2px dashed ${proofFile ? 'var(--gr-mint)' : 'var(--gr-line)'}`, cursor: 'pointer', background: proofFile ? 'rgba(47,184,117,0.04)' : '#fff', transition: 'all 0.15s' }}>
                  <IconUpload size={16} stroke={proofFile ? 'var(--gr-mint)' : 'var(--gr-stone-2)'} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: proofFile ? 'var(--gr-mint)' : 'var(--gr-ink)' }}>{proofFile ? proofFile.name : 'Choose file…'}</div>
                    {!proofFile && <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>PNG, JPG, PDF up to 5 MB</div>}
                  </div>
                  <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</Btn>
                <Btn kind="crimson" type="submit" style={{ flex: 2 }}>Review →</Btn>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── Step 3 — Confirm ── */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 16 }}>Confirm your payment</div>
            <div style={{ background: 'var(--gr-paper)', borderRadius: 14, padding: '18px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Covers',       value: coverageLabel },
                { label: 'Amount (USD)', value: `$${totalUsd.toLocaleString()}${monthsCount > 1 ? ` (${monthsCount} × $${monthlyRent.toLocaleString()})` : ''}` },
                { label: 'Amount (LRD)', value: `L${totalLrd.toLocaleString()}` },
                { label: 'Method',       value: method === 'mtn_momo' ? 'MTN Mobile Money' : 'Bank Transfer' },
                { label: 'Proof',        value: proofFile ? proofFile.name : 'None uploaded' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>{r.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)', maxWidth: '55%', textAlign: 'right' }}>{r.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</Btn>
              <Btn kind="crimson" style={{ flex: 2 }} loading={submitMut.isPending} onClick={() => handleSubmit(v => submitMut.mutate(v))()}>
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

function ordinal(n: number | null): string {
  if (!n) return ''
  if (n >= 11 && n <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gr-stone)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--gr-line)', background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none' }
