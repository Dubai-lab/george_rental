import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Payment } from '@/types'
import Pill from '@/components/ui/Pill'
import { IconCheck, IconClock, IconAlert, IconFile, IconDownload } from '@/components/ui/Icons'

function useReceipts(userId: string | undefined) {
  return useQuery<Payment[]>({
    queryKey: ['receipts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Payment[]
    },
    staleTime: 30_000,
  })
}

function statusTone(s: string): any {
  if (s === 'confirmed') return 'mint'
  if (s === 'rejected') return 'crimson'
  return 'gold'
}

function methodLabel(m: string) {
  if (m === 'mtn_momo') return 'MTN MoMo'
  if (m === 'bank_transfer') return 'Bank Transfer'
  return 'Cash'
}

export default function Receipts() {
  const { profile } = useAuth()
  const { data: receipts = [], isLoading } = useReceipts(profile?.id)

  const totalPaid = receipts.filter(r => r.status === 'confirmed').reduce((s, r) => s + r.amount_usd, 0)

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>My Receipts</div>
        {receipts.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>
            {receipts.filter(r => r.status === 'confirmed').length} confirmed · Total paid: <strong style={{ color: 'var(--gr-ink)' }}>${totalPaid.toLocaleString()}</strong>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading…</div>
      ) : receipts.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No receipts yet</div>
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 6 }}>
            Pay your first month's rent and your receipt will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {receipts.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)',
                overflow: 'hidden',
              }}
            >
              {/* Receipt card header */}
              <div style={{
                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: r.status === 'confirmed' ? '1px solid var(--gr-line)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: r.status === 'confirmed' ? 'rgba(47,184,117,0.1)' : r.status === 'pending' ? 'rgba(233,185,73,0.1)' : 'rgba(209,31,44,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {r.status === 'confirmed' ? <IconCheck size={18} stroke="var(--gr-mint)" />
                      : r.status === 'pending' ? <IconClock size={18} stroke="var(--gr-gold)" />
                      : <IconAlert size={18} stroke="var(--gr-crimson)" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>
                      {r.period_month ? format(parseISO(r.period_month + '-01'), 'MMMM yyyy') : 'Payment'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>
                      {methodLabel(r.method)} · {format(parseISO(r.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 700, color: 'var(--gr-ink)' }}>
                    ${r.amount_usd.toLocaleString()}
                  </div>
                  <Pill tone={statusTone(r.status)} style={{ marginTop: 4, fontSize: 10 }}>
                    {r.status}
                  </Pill>
                </div>
              </div>

              {/* Confirmed receipt details */}
              {r.status === 'confirmed' && (
                <div style={{ padding: '14px 18px', background: 'rgba(47,184,117,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    {r.receipt_number && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', fontWeight: 500 }}>Receipt #</div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 700, color: 'var(--gr-ink)', marginTop: 2 }}>{r.receipt_number}</div>
                      </div>
                    )}
                    {r.confirmed_at && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', fontWeight: 500 }}>Confirmed</div>
                        <div style={{ fontSize: 12, color: 'var(--gr-ink)', marginTop: 2 }}>{format(parseISO(r.confirmed_at), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', fontWeight: 500 }}>LRD</div>
                      <div style={{ fontSize: 12, color: 'var(--gr-ink)', marginTop: 2 }}>L${(r.amount_lrd ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
                  {r.proof_url && (
                    <a
                      href={r.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 8, border: '1px solid var(--gr-line)',
                        background: '#fff', textDecoration: 'none',
                        fontSize: 12, color: 'var(--gr-stone-2)', fontWeight: 500,
                      }}
                    >
                      <IconDownload size={13} />
                      Proof
                    </a>
                  )}
                </div>
              )}

              {/* Pending / Rejected messages */}
              {r.status === 'pending' && (
                <div style={{ padding: '12px 18px', background: 'rgba(233,185,73,0.05)', fontSize: 12, color: 'var(--gr-stone-2)' }}>
                  Awaiting confirmation from your landlord. Usually within 24 hours.
                </div>
              )}
              {r.status === 'rejected' && (
                <div style={{ padding: '12px 18px', background: 'rgba(209,31,44,0.04)', fontSize: 12, color: 'var(--gr-crimson)' }}>
                  Payment rejected. {r.notes ? `Note: ${r.notes}` : 'Contact your landlord for details.'}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
