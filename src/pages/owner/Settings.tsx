import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Btn from '@/components/ui/Btn'
import { IconClose } from '@/components/ui/Icons'

interface BankAccount { bank: string; account: string; name: string }
interface PaySettings { id: string; momo_number: string; momo_name: string; banks: BankAccount[]; updated_at: string }

function usePaySettings() {
  return useQuery<PaySettings | null>({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_settings').select('*').maybeSingle()
      return data as PaySettings | null
    },
    staleTime: 60_000,
  })
}

export default function OwnerSettings() {
  const qc = useQueryClient()
  const { data: cfg, isLoading } = usePaySettings()

  const [momoEdit, setMomoEdit] = useState(false)
  const [momoNum,  setMomoNum]  = useState('')
  const [momoName, setMomoName] = useState('')
  const [momoErr,  setMomoErr]  = useState('')

  const [banksEdit, setBanksEdit] = useState(false)
  const [banks, setBanks]         = useState<BankAccount[]>([])
  const [newBank, setNewBank]     = useState({ bank: '', account: '', name: '' })
  const [bankErr, setBankErr]     = useState('')

  const saveMomo = useMutation({
    mutationFn: async () => {
      if (!cfg) return
      const { error } = await supabase
        .from('payment_settings')
        .update({ momo_number: momoNum.trim(), momo_name: momoName.trim(), updated_at: new Date().toISOString() })
        .eq('id', cfg.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-settings'] }); setMomoEdit(false); setMomoErr('') },
    onError:   (e: any) => setMomoErr(e.message ?? 'Save failed'),
  })

  const saveBanks = useMutation({
    mutationFn: async (list: BankAccount[]) => {
      if (!cfg) return
      const { error } = await supabase
        .from('payment_settings')
        .update({ banks: list, updated_at: new Date().toISOString() })
        .eq('id', cfg.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-settings'] }); setBanksEdit(false); setBankErr('') },
    onError:   (e: any) => setBankErr(e.message ?? 'Save failed'),
  })

  function addBank() {
    if (!newBank.bank.trim() || !newBank.account.trim()) {
      setBankErr('Bank name and account number are required.')
      return
    }
    setBanks(prev => [...prev, { ...newBank }])
    setNewBank({ bank: '', account: '', name: '' })
    setBankErr('')
  }

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(209,31,44,0.15)', borderTopColor: 'var(--gr-crimson)', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!cfg) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--gr-stone-2)', fontSize: 14 }}>
      No payment settings found. Run the database seed to add a row to <code>payment_settings</code>.
    </div>
  )

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 700, color: 'var(--gr-ink)', letterSpacing: '-0.02em' }}>Payment Settings</div>
        <div style={{ fontSize: 13, color: 'var(--gr-stone-2)', marginTop: 4 }}>Configure how tenants pay rent — shown live on the Pay Rent page</div>
      </div>

      {/* MTN MoMo */}
      <div style={section}>
        <div style={sectionHead}>
          <div>
            <div style={sectionTitle}>MTN Mobile Money</div>
            <div style={sectionSub}>Tenants transfer rent to this number</div>
          </div>
          {!momoEdit && (
            <button style={actionBtn} onClick={() => {
              setMomoNum(cfg.momo_number ?? '')
              setMomoName(cfg.momo_name ?? '')
              setMomoEdit(true)
            }}>Edit</button>
          )}
        </div>

        {momoEdit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {momoErr && <div style={errBox}>{momoErr}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>MoMo Number</label>
                <input value={momoNum} onChange={e => setMomoNum(e.target.value)} placeholder="088 605 5575" style={inp} />
              </div>
              <div>
                <label style={lbl}>Account Name</label>
                <input value={momoName} onChange={e => setMomoName(e.target.value)} placeholder="George Rental" style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="ghost" onClick={() => { setMomoEdit(false); setMomoErr('') }}>Cancel</Btn>
              <Btn kind="crimson" loading={saveMomo.isPending} onClick={() => saveMomo.mutate()}>Save changes</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={metaLabel}>MoMo Number</div>
              <div style={metaValue}>{cfg.momo_number || '—'}</div>
            </div>
            <div>
              <div style={metaLabel}>Account Name</div>
              <div style={metaValue}>{cfg.momo_name || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Bank Accounts */}
      <div style={section}>
        <div style={sectionHead}>
          <div>
            <div style={sectionTitle}>Bank Accounts</div>
            <div style={sectionSub}>Tenants can transfer to any of these accounts</div>
          </div>
          {!banksEdit && (
            <button style={actionBtn} onClick={() => {
              setBanks(cfg.banks ?? [])
              setNewBank({ bank: '', account: '', name: '' })
              setBankErr('')
              setBanksEdit(true)
            }}>Edit</button>
          )}
        </div>

        {banksEdit ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bankErr && <div style={errBox}>{bankErr}</div>}

            {banks.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--gr-paper)', borderRadius: 10, border: '1px solid var(--gr-line)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-navy)' }}>{b.bank}</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gr-ink)', marginTop: 2 }}>{b.account}</div>
                  {b.name && <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 1 }}>{b.name}</div>}
                </div>
                <button
                  onClick={() => setBanks(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gr-line)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconClose size={12} stroke="var(--gr-stone)" />
                </button>
              </div>
            ))}

            <div style={{ padding: 16, background: 'rgba(11,26,61,0.03)', borderRadius: 12, border: '1px dashed var(--gr-line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gr-stone)', marginBottom: 2 }}>Add bank account</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={lbl}>Bank name</label>
                  <input value={newBank.bank} onChange={e => setNewBank(p => ({ ...p, bank: e.target.value }))} placeholder="LBDI" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Account number</label>
                  <input value={newBank.account} onChange={e => setNewBank(p => ({ ...p, account: e.target.value }))} placeholder="0012 3456 789" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Account name</label>
                  <input value={newBank.name} onChange={e => setNewBank(p => ({ ...p, name: e.target.value }))} placeholder="George Rental Ltd" style={inp} />
                </div>
              </div>
              <button onClick={addBank} style={{ alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 8, background: 'var(--gr-midnight)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Add
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="ghost" onClick={() => { setBanksEdit(false); setBankErr('') }}>Cancel</Btn>
              <Btn kind="crimson" loading={saveBanks.isPending} onClick={() => saveBanks.mutate(banks)}>Save changes</Btn>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(cfg.banks ?? []).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--gr-stone-2)' }}>No bank accounts added yet.</div>
            ) : (cfg.banks ?? []).map((b, i) => (
              <div key={i} style={{ padding: '12px 16px', background: 'var(--gr-paper)', borderRadius: 10, border: '1px solid var(--gr-line)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gr-navy)' }}>{b.bank}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--gr-ink)', marginTop: 2 }}>{b.account}</div>
                {b.name && <div style={{ fontSize: 11, color: 'var(--gr-stone-2)', marginTop: 1 }}>{b.name}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--gr-stone-2)' }}>
        Last updated: {cfg.updated_at ? new Date(cfg.updated_at).toLocaleString() : '—'}
      </div>
    </div>
  )
}

const section:     React.CSSProperties = { background: '#fff', borderRadius: 16, border: '1px solid var(--gr-line)', padding: '22px 24px', marginBottom: 20 }
const sectionHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }
const sectionTitle:React.CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--gr-ink)' }
const sectionSub:  React.CSSProperties = { fontSize: 12, color: 'var(--gr-stone-2)', marginTop: 2 }
const actionBtn:   React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--gr-crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }
const lbl:         React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gr-stone-2)', marginBottom: 5 }
const inp:         React.CSSProperties = { width: '100%', height: 40, padding: '0 12px', borderRadius: 9, border: '1px solid var(--gr-line)', background: '#fff', fontSize: 14, color: 'var(--gr-ink)', outline: 'none' }
const metaLabel:   React.CSSProperties = { fontSize: 11, color: 'var(--gr-stone-2)', fontWeight: 500, marginBottom: 4 }
const metaValue:   React.CSSProperties = { fontSize: 15, fontWeight: 600, color: 'var(--gr-ink)' }
const errBox:      React.CSSProperties = { padding: '10px 14px', borderRadius: 8, background: 'rgba(209,31,44,0.06)', border: '1px solid rgba(209,31,44,0.2)', color: 'var(--gr-crimson)', fontSize: 13 }
