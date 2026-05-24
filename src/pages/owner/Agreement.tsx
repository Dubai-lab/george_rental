import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Lease, Profile, Store } from '@/types'

type FullLease = Lease & { store: Store; tenant: Profile }

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export default function Agreement() {
  const { leaseId } = useParams<{ leaseId: string }>()
  const [lease, setLease]   = useState<FullLease | null>(null)
  const [fxRate, setFxRate] = useState(180)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    async function load() {
      const [leaseRes, fxRes] = await Promise.all([
        supabase
          .from('leases')
          .select('*, tenant:profiles!leases_tenant_id_fkey(*), store:stores(*)')
          .eq('id', leaseId!)
          .single(),
        supabase.from('fx_rates').select('rate').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      if (leaseRes.error || !leaseRes.data) {
        setError('Could not load agreement data.')
      } else {
        setLease(leaseRes.data as FullLease)
      }
      if (fxRes.data) setFxRate(fxRes.data.rate)
      setLoading(false)
    }
    load()
  }, [leaseId])

  if (loading) return <div style={loadingStyle}>Loading agreement…</div>
  if (error || !lease) return <div style={loadingStyle}>{error || 'Agreement not found.'}</div>

  const tenant   = lease.tenant
  const store    = lease.store
  const dueDay   = new Date(lease.start_date).getDate()
  const rentUsd  = lease.monthly_rent_usd
  const rentLrd  = Math.round(rentUsd * fxRate).toLocaleString()
  const startDate = format(parseISO(lease.start_date), 'MMMM d, yyyy')
  const today     = format(new Date(), 'MMMM d, yyyy')

  return (
    <>
      {/* Print-only styles injected into head */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; padding: 40px 48px !important; max-width: 100% !important; }
        }
        @page { margin: 1.5cm; size: A4; }
        body { font-family: Georgia, 'Times New Roman', serif; background: #f4f4f4; }
      `}</style>

      {/* Print button bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#060914', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#F6F1E4', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 600 }}>
          Store Rental Agreement — {tenant.full_name}
        </span>
        <button
          onClick={() => window.print()}
          style={{
            padding: '9px 22px', borderRadius: 8, background: '#D11F2C', color: '#fff',
            border: 'none', fontFamily: 'sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🖨 Print / Save as PDF
        </button>
      </div>

      {/* Agreement document */}
      <div className="page" style={{
        maxWidth: 800, margin: '72px auto 60px', background: '#fff',
        padding: '60px 72px', boxShadow: '0 4px 40px rgba(0,0,0,0.12)',
        lineHeight: 1.75, color: '#1a1a1a', fontSize: 13,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #1a1a1a', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            George Rental Properties
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            Bob Taylor Road, Red Light, Paynesville, Liberia<br />
            Tel: +231 88 605 5575 / +231 77 056 7682 &nbsp;·&nbsp; Email: eg8217178@gmail.com
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 24, letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid #ccc', paddingTop: 18 }}>
            Store Rental Agreement
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Date: {today}</div>
        </div>

        {/* Parties */}
        <SectionTitle>1. Parties to This Agreement</SectionTitle>
        <TwoCol
          left={<>
            <FieldTitle>Landlord</FieldTitle>
            <FieldLine label="Full Name" value="George Ibekwe" />
            <FieldLine label="Address" value="Bob Taylor Road, Red Light, Paynesville, Liberia" />
            <FieldLine label="Phone" value="+231 88 605 5575" />
          </>}
          right={<>
            <FieldTitle>Tenant</FieldTitle>
            <FieldLine label="Full Name" value={tenant.full_name} />
            <FieldLine label="Phone" value={tenant.phone ?? '—'} />
            <FieldLine label="Email" value={tenant.email ?? '—'} />
            <FieldBlank label="National ID / Passport No." />
          </>}
        />

        {/* Store Details */}
        <SectionTitle>2. Store Details</SectionTitle>
        <table style={tableStyle}>
          <tbody>
            <TR label="Store Code"    value={store.code} />
            <TR label="Store Name"    value={store.name} />
            <TR label="Store Address" value={store.address ?? 'Red Light, Paynesville, Liberia'} />
            <TR label="Business Name" value={lease.business_name ?? '—'} />
            <TR label="Business Type" value={lease.business_type ?? '—'} />
            <TR label="Lease Code"    value={lease.lease_code ?? '—'} mono />
            <TR label="Lease Start Date" value={startDate} />
            <TR label="Monthly Rent" value={`USD $${rentUsd.toLocaleString()}   (L$${rentLrd} at prevailing rate)`} />
          </tbody>
        </table>

        {/* Payment Terms */}
        <SectionTitle>3. Payment Terms &amp; Grace Period</SectionTitle>
        <ol style={olStyle}>
          <li>Rent is due on the <strong>{ordinal(dueDay)}</strong> of every month, anchored to the lease start date.</li>
          <li>A <strong>grace period of 7 days</strong> is allowed after the due date. Rent must be paid no later than the {ordinal(dueDay + 7 > 28 ? dueDay + 7 - 30 : dueDay + 7)} of each month.</li>
          <li>If payment is not received within the grace period, the Landlord will contact the Tenant and a <strong>late fee</strong> may apply at the Landlord's discretion.</li>
          <li>Tenants may pay multiple months in advance (2, 3, 6 or 12 months). Early payment is encouraged and reduces the risk of late fees.</li>
          <li>All payments must be submitted with valid proof of transaction via MTN Mobile Money receipt, bank transfer slip, or cash receipt.</li>
          <li>Accepted payment methods: <strong>MTN Mobile Money · Bank Transfer · Cash</strong>.</li>
        </ol>

        {/* Tenant Obligations */}
        <SectionTitle>4. Tenant Obligations</SectionTitle>
        <ol style={olStyle}>
          <li>Maintain the store in a clean and good condition at all times.</li>
          <li>Not sublet, share, or transfer the store to any third party without prior <strong>written consent</strong> from the Landlord.</li>
          <li>Use the store exclusively for the declared business type stated in this agreement.</li>
          <li>Report any damage or maintenance issues to the Landlord promptly.</li>
          <li>Not make any structural alterations, additions, or modifications to the store without written permission.</li>
          <li>Vacate the store on time and return it in the same condition as received upon termination of this agreement.</li>
        </ol>

        {/* Landlord Obligations */}
        <SectionTitle>5. Landlord Obligations</SectionTitle>
        <ol style={olStyle}>
          <li>Deliver the store in a clean and habitable condition on the lease start date.</li>
          <li>Address maintenance issues reported by the tenant within a reasonable timeframe.</li>
          <li>Provide at least <strong>30 days written notice</strong> before any rent increase.</li>
          <li>Respect the Tenant's right to peaceful and undisturbed use of the store during the lease period.</li>
        </ol>

        {/* Damages */}
        <SectionTitle>6. Damages &amp; Liability</SectionTitle>
        <ol style={olStyle}>
          <li>The Tenant is fully responsible for any damage to the store beyond normal wear and tear.</li>
          <li>The cost of repairs for damage caused by the Tenant will be billed separately or deducted from any security deposit held.</li>
          <li>The Landlord is not liable for any loss of or damage to the Tenant's goods, equipment, or property stored inside the store.</li>
        </ol>

        {/* Termination */}
        <SectionTitle>7. Termination</SectionTitle>
        <ol style={olStyle}>
          <li>Either party may terminate this agreement by giving <strong>30 days written notice</strong> to the other party.</li>
          <li>All outstanding rent and fees must be fully settled before the Tenant vacates.</li>
          <li>The store must be returned in the same condition as it was received, clean and undamaged.</li>
          <li>If the Tenant abandons the store without notice, the Landlord reserves the right to take immediate possession and recover any losses.</li>
        </ol>

        {/* Governing Law */}
        <SectionTitle>8. Governing Law</SectionTitle>
        <p style={{ margin: '0 0 28px', fontSize: 13 }}>
          This agreement is governed by the laws of the <strong>Republic of Liberia</strong>.
          Any dispute arising from this agreement shall first be resolved through mutual negotiation.
          If unresolved, it shall be referred to the appropriate authority in Liberia.
        </p>

        {/* Signatures */}
        <SectionTitle>9. Signatures</SectionTitle>
        <p style={{ margin: '0 0 20px', fontSize: 13 }}>
          By signing below, both parties confirm they have read, understood, and agreed to all terms of this Store Rental Agreement.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 32 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 32, color: '#555' }}>Tenant</div>
            <SignLine label="Signature" />
            <SignLine label="Full Name (print)" value={tenant.full_name} />
            <SignLine label="Date" />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 32, color: '#555' }}>Landlord</div>
            <SignLine label="Signature" />
            <SignLine label="Full Name (print)" value="George Ibekwe" />
            <SignLine label="Date" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 18, borderTop: '1px solid #ccc', fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
          Both parties should retain a signed hard copy of this agreement.<br />
          A scanned copy may be uploaded to the George Rental management system for digital record-keeping.<br />
          Lease Code: <strong style={{ fontFamily: 'monospace' }}>{lease.lease_code ?? '—'}</strong> &nbsp;·&nbsp; Generated: {today}
        </div>
      </div>
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1.5px solid #1a1a1a', paddingBottom: 6, marginBottom: 14, marginTop: 28 }}>
      {children}
    </div>
  )
}

function TwoCol({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 28 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  )
}

function FieldTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: 10, borderBottom: '1px solid #e0e0e0', paddingBottom: 4 }}>{children}</div>
}

function FieldLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#555', minWidth: 80, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function FieldBlank({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#555' }}>{label}: </span>
      <span style={{ display: 'inline-block', width: 180, borderBottom: '1px solid #333', verticalAlign: 'bottom' }}>&nbsp;</span>
    </div>
  )
}

function TR({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '7px 14px', fontSize: 12, color: '#555', fontWeight: 600, width: 160, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #eee', fontFamily: mono ? 'monospace' : undefined }}>{value}</td>
    </tr>
  )
}

function SignLine({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>{label}</div>
      {value
        ? <div style={{ fontSize: 13, fontWeight: 600, borderBottom: '1px solid #333', paddingBottom: 4 }}>{value}</div>
        : <div style={{ borderBottom: '1px solid #333', height: 24 }} />
      }
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse',
  border: '1px solid #e0e0e0', borderRadius: 4, marginBottom: 28, overflow: 'hidden',
}

const olStyle: React.CSSProperties = {
  margin: '0 0 28px', paddingLeft: 22, fontSize: 13,
}

const loadingStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: '100vh', fontSize: 15, color: '#555', fontFamily: 'sans-serif',
}
