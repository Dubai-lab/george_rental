import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { MaintenanceRequest, Lease } from '@/types'
import Pill from '@/components/ui/Pill'
import Btn from '@/components/ui/Btn'
import { IconPlus, IconClose, IconCheck, IconWrench } from '@/components/ui/Icons'

type FormValues = {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

function useMyRequests(userId: string | undefined) {
  return useQuery<MaintenanceRequest[]>({
    queryKey: ['my-maintenance', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as MaintenanceRequest[]
    },
    staleTime: 30_000,
  })
}

function statusTone(s: string): any {
  if (s === 'resolved') return 'mint'
  if (s === 'in_progress') return 'gold'
  return 'crimson'
}

function priorityColor(p: string) {
  if (p === 'high') return 'var(--gr-crimson)'
  if (p === 'medium') return 'var(--gr-gold)'
  return 'var(--gr-stone-2)'
}

export default function TenantMaintenance() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: requests = [], isLoading } = useMyRequests(profile?.id)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { priority: 'medium' },
  })

  const submitMut = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!profile) throw new Error('Not signed in')

      // Get active lease for this tenant
      const { data: lease } = await supabase
        .from('leases')
        .select('id, store_id')
        .eq('tenant_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!lease) throw new Error('No active lease found')

      const { error } = await supabase.from('maintenance_requests').insert({
        lease_id:    lease.id,
        tenant_id:   profile.id,
        store_id:    lease.store_id,
        title:       values.title,
        description: values.description || null,
        priority:    values.priority,
        status:      'open',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-maintenance'] })
      setSubmitted(true)
      reset()
    },
  })

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)' }}>Maintenance</div>
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>
            {requests.filter(r => r.status !== 'resolved').length} open requests
          </div>
        </div>
        <Btn kind="crimson" size="sm" icon={<IconPlus size={14} stroke="#fff" />} onClick={() => { setFormOpen(true); setSubmitted(false) }}>
          New request
        </Btn>
      </div>

      {/* New request form (slide down) */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 20 }}
          >
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', padding: '20px 20px 22px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 99, background: 'rgba(47,184,117,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                  }}>
                    <IconCheck size={22} stroke="var(--gr-mint)" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>Request submitted!</div>
                  <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 4 }}>Your landlord will be notified.</div>
                  <Btn kind="ghost" size="sm" style={{ marginTop: 14 }} onClick={() => setFormOpen(false)}>Close</Btn>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)' }}>New Maintenance Request</div>
                    <button onClick={() => setFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gr-stone-2)', padding: 0 }}>
                      <IconClose size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleSubmit(v => submitMut.mutate(v))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Issue title <span style={{ color: 'var(--gr-crimson)' }}>*</span></label>
                      <input
                        placeholder="e.g. Leaking roof, Broken door lock…"
                        {...register('title', { required: 'Please describe the issue briefly' })}
                        style={{ ...inputStyle, borderColor: errors.title ? 'var(--gr-crimson)' : 'var(--gr-line)' }}
                      />
                      {errors.title && <div style={{ fontSize: 11, color: 'var(--gr-crimson)', marginTop: 4 }}>{errors.title.message}</div>}
                    </div>
                    <div>
                      <label style={labelStyle}>Description (optional)</label>
                      <textarea
                        rows={3}
                        placeholder="More details about the issue…"
                        {...register('description')}
                        style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Priority</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['low', 'medium', 'high'] as const).map(p => (
                          <label key={p} style={{ flex: 1 }}>
                            <input type="radio" value={p} {...register('priority')} style={{ display: 'none' }} />
                            <div style={{
                              textAlign: 'center', padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                              border: `1px solid ${p === 'high' ? 'var(--gr-crimson)' : p === 'medium' ? 'var(--gr-gold)' : 'var(--gr-line)'}`,
                              color: p === 'high' ? 'var(--gr-crimson)' : p === 'medium' ? 'var(--gr-gold)' : 'var(--gr-stone-2)',
                              textTransform: 'capitalize',
                            }}>
                              {p}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Btn kind="crimson" type="submit" loading={submitMut.isPending} style={{ width: '100%', marginTop: 4 }}>
                      Submit request
                    </Btn>
                    {submitMut.isError && (
                      <div style={{ fontSize: 12, color: 'var(--gr-crimson)', textAlign: 'center' }}>
                        {(submitMut.error as Error).message}
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests list */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }}>No maintenance requests</div>
          <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 6 }}>
            Submit a request if something in your store needs attention.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                background: '#fff', borderRadius: 14, border: '1px solid var(--gr-line)', padding: '16px 18px',
                borderLeft: `3px solid ${r.status === 'resolved' ? 'var(--gr-mint)' : r.status === 'in_progress' ? 'var(--gr-gold)' : 'var(--gr-crimson)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gr-ink)', marginBottom: 4 }}>{r.title}</div>
                  {r.description && (
                    <div style={{ fontSize: 12, color: 'var(--gr-stone-2)', lineHeight: 1.5, marginBottom: 8 }}>{r.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: priorityColor(r.priority), fontWeight: 600, textTransform: 'capitalize' }}>
                      {r.priority} priority
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>·</div>
                    <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>
                      {format(parseISO(r.created_at), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
                <Pill tone={statusTone(r.status)} style={{ flexShrink: 0, fontSize: 11 }}>
                  {r.status.replace('_', ' ')}
                </Pill>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gr-stone)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--gr-line)', background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none', fontFamily: 'var(--f-body)' }
