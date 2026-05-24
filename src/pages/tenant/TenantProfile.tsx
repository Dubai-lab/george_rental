import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Lease, Store } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { IconPhone, IconMail, IconStore, IconLogout, IconCheck, IconClose, IconCalendar } from '@/components/ui/Icons'

type TenantLease = Lease & { store: Store }

function useLease(userId: string | undefined) {
  return useQuery<TenantLease | null>({
    queryKey: ['tenant-lease-profile', userId],
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
    staleTime: 60_000,
  })
}

export default function TenantProfile() {
  const { profile, signOut, refreshProfile } = useAuth()
  const { data: lease } = useLease(profile?.id)

  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone]               = useState(profile?.phone ?? '')
  const [phoneErr, setPhoneErr]         = useState('')
  const [signingOut, setSigningOut]     = useState(false)

  const updatePhone = useMutation({
    mutationFn: async (val: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: val.trim() || null })
        .eq('id', profile!.id)
      if (error) throw error
    },
    onSuccess: async () => { await refreshProfile(); setEditingPhone(false) },
    onError: (e: any) => setPhoneErr(e.message ?? 'Update failed'),
  })

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
  }

  if (!profile) return null

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--gr-midnight)', padding: '36px 24px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="gr-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Avatar name={profile.full_name} size={72} />
          </div>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 700, color: 'var(--gr-cream)' }}>
            {profile.full_name}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 8, padding: '3px 14px',
            borderRadius: 99, background: 'rgba(209,31,44,0.3)',
            fontSize: 11, fontWeight: 700, color: '#fff',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Tenant
          </div>
        </div>
      </div>

      {/* ── Contact info ───────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={sectionLabel}>Contact Info</div>
        <div style={card}>

          {/* Email */}
          <div style={{ ...row, borderBottom: '1px solid var(--gr-line)' }}>
            <div style={iconBox('rgba(11,26,61,0.07)')}>
              <IconMail size={16} stroke="var(--gr-navy)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={metaLabel}>Email</div>
              <div style={metaValue}>{profile.email ?? '—'}</div>
            </div>
          </div>

          {/* Phone — editable */}
          <div style={row}>
            <div style={iconBox('rgba(47,184,117,0.09)')}>
              <IconPhone size={16} stroke="var(--gr-mint)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={metaLabel}>Phone</div>
              {editingPhone ? (
                <>
                  <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
                    <input
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setPhoneErr('') }}
                      placeholder="+231 88 000 0000"
                      autoFocus
                      style={{ flex: 1, height: 36, padding: '0 10px', borderRadius: 8, border: `1px solid ${phoneErr ? 'var(--gr-crimson)' : 'var(--gr-line)'}`, fontSize: 13, outline: 'none' }}
                    />
                    <button
                      onClick={() => updatePhone.mutate(phone)}
                      disabled={updatePhone.isPending}
                      style={iconAction('var(--gr-mint)')}
                    >
                      <IconCheck size={14} stroke="#fff" />
                    </button>
                    <button
                      onClick={() => { setPhone(profile.phone ?? ''); setEditingPhone(false); setPhoneErr('') }}
                      style={iconAction('var(--gr-paper)', '1px solid var(--gr-line)')}
                    >
                      <IconClose size={14} stroke="var(--gr-stone)" />
                    </button>
                  </div>
                  {phoneErr && <div style={{ fontSize: 11, color: 'var(--gr-crimson)', marginTop: 4 }}>{phoneErr}</div>}
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                  <div style={{ ...metaValue, color: profile.phone ? 'var(--gr-ink)' : 'var(--gr-stone-2)' }}>
                    {profile.phone ?? 'Not set'}
                  </div>
                  <button
                    onClick={() => { setPhone(profile.phone ?? ''); setEditingPhone(true) }}
                    style={{ fontSize: 12, color: 'var(--gr-crimson)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active lease ────────────────────────────────────────── */}
      {lease && (
        <div style={{ padding: '24px 20px 0' }}>
          <div style={sectionLabel}>Current Lease</div>
          <div style={card}>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--gr-line)' }}>
              <div style={iconBox('rgba(209,31,44,0.08)')}>
                <IconStore size={18} stroke="var(--gr-crimson)" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gr-ink)' }}>{lease.store.name}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 2 }}>
                  {lease.store.code}
                  {lease.store.address ? ` · ${lease.store.address}` : ''}
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Business', value: lease.business_name ?? '—' },
                { label: 'Monthly Rent', value: `$${lease.monthly_rent_usd.toLocaleString()} USD` },
                { label: 'Start Date', value: format(parseISO(lease.start_date), 'dd MMM yyyy') },
                { label: 'Lease Code', value: lease.lease_code ?? '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--gr-stone-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-ink)' }}>{value}</div>
                </div>
              ))}
            </div>

            {lease.end_date && (
              <div style={{ padding: '12px 18px', background: 'rgba(233,185,73,0.06)', borderTop: '1px solid var(--gr-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconCalendar size={14} stroke="var(--gr-gold)" />
                <div style={{ fontSize: 12, color: 'var(--gr-stone-2)' }}>
                  Lease ends <strong style={{ color: 'var(--gr-ink)' }}>{format(parseISO(lease.end_date), 'dd MMM yyyy')}</strong>
                </div>
              </div>
            )}
            {lease.agreement_url && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--gr-line)' }}>
                <a
                  href={lease.agreement_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--gr-crimson)', textDecoration: 'underline' }}
                >
                  View Rental Agreement →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sign out ─────────────────────────────────────────────── */}
      <div style={{ padding: '32px 20px 0' }}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%', height: 50, borderRadius: 14,
            background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.18)',
            color: 'var(--gr-crimson)', fontWeight: 700, fontSize: 14,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          }}
        >
          <IconLogout size={17} stroke="var(--gr-crimson)" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </motion.button>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 18, lineHeight: 1.6 }}>
          George Rental · {profile.email}<br />
          +231 88 605 5575 · eg8217178@gmail.com
        </div>
      </div>
    </div>
  )
}

// ── Shared styles ───────────────────────────────────────────────
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--gr-stone-2)',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
}
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', overflow: 'hidden',
}
const row: React.CSSProperties = {
  padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
}
const metaLabel: React.CSSProperties = {
  fontSize: 11, color: 'var(--gr-stone-2)', fontWeight: 500,
}
const metaValue: React.CSSProperties = {
  fontSize: 14, color: 'var(--gr-ink)', marginTop: 2,
}
function iconBox(bg: string): React.CSSProperties {
  return { width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }
}
function iconAction(bg: string, border?: string): React.CSSProperties {
  return { width: 36, height: 36, borderRadius: 8, background: bg, border: border ?? 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
}
