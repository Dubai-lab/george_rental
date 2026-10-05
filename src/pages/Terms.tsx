import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gr-midnight)', color: 'var(--gr-cream)', fontFamily: 'var(--f-body)' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        <Link to="/" style={{ color: 'rgba(246,241,228,0.7)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
          ← Back to home
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gr-cream)', marginBottom: 8 }}>
          Terms of Use &amp; Refund Policy
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(246,241,228,0.7)', marginBottom: 48 }}>
          George Rental · Effective date: 5 October 2026
        </p>

        <Section title="1. Who we are">
          George Rental manages commercial store rentals in Monrovia, Liberia. This website lets people browse stores, send rental requests, and — for tenants — report rent payments, view receipts and request maintenance. Contact details are at the end of this page.
        </Section>

        <Section title="2. Using the website">
          By using George Rental you agree to:
          <ul>
            <li>Give accurate, truthful information about yourself and your payments</li>
            <li>Keep your password private and tell us if you think someone else has used your account</li>
            <li>Use the website only for genuine rental requests, rent payments and maintenance requests</li>
            <li>Not try to access accounts or information that are not yours</li>
          </ul>
          We may suspend or close an account that breaks these terms or uploads false payment proof.
        </Section>

        <Section title="3. Accounts and rental requests">
          Creating an account is free and does not reserve a store. Sending a request for a store is an expression of interest only. A store is yours only when the office has agreed terms with you, assigned the store to your account and a rental agreement has been signed. Store details, photos and rents shown on the website can change and are confirmed in your rental agreement.
        </Section>

        <Section title="4. How rent payments work">
          The website does not take money from you. You pay rent directly to George Rental by mobile money or bank transfer, using the account details shown on the Pay Rent page, and then upload proof of that payment. The office checks each payment against its own records. A payment is only treated as received once the office has confirmed it, and a receipt is issued at that point. Your mobile money provider or bank may charge its own fees; those are not charged by George Rental.
        </Section>

        <Section title="5. Refund policy">
          <ul>
            <li><strong>Paid twice or paid too much:</strong> tell us and we will either credit the extra amount to your next rent period or refund it, whichever you choose.</li>
            <li><strong>Paid to the wrong number or account:</strong> money sent to an account that is not one shown on the Pay Rent page has not reached us. Contact your mobile money provider or bank straight away; we will help by confirming our correct details.</li>
            <li><strong>Payment not confirmed:</strong> if we cannot match your proof to money received, the payment is marked "rejected" with a note. No money is held by the website, so there is nothing to refund; contact the office to resolve it.</li>
            <li><strong>Rent already paid for a period:</strong> rent for a period you have occupied the store is not refundable. Rent paid in advance for months after your tenancy ends is handled as set out in your signed rental agreement.</li>
          </ul>
          To ask for a refund or credit, contact the office with your name, store, the amount, the date and the transaction reference. Refunds are sent by the same method you paid with.
        </Section>

        <Section title="6. Maintenance requests">
          Maintenance requests sent through the website are passed to the office. Sending a request does not guarantee a particular response time; responsibilities for repairs are set out in your rental agreement.
        </Section>

        <Section title="7. Availability">
          We work to keep the website available but do not promise it will always be online or free of errors. If the website is unavailable you can still pay rent and reach the office using the contact details below.
        </Section>

        <Section title="8. Your rental agreement comes first">
          These terms cover use of the website. Your tenancy itself is governed by your signed rental agreement. If the two ever differ, the signed rental agreement applies.
        </Section>

        <Section title="9. Governing law">
          These terms are governed by the laws of the Republic of Liberia.
        </Section>

        <Section title="10. Changes">
          We may update these terms. The effective date at the top shows the latest version. Significant changes will be announced by email or a notice on the website.
        </Section>

        <Section title="11. Contact">
          <span>
            George Rental<br />
            Bob Taylor Road, Red Light, Paynesville, Monrovia, Liberia<br />
            Phone: +231 88 605 5575 / +231 77 056 7682<br />
            Email: eg8217178@gmail.com
          </span>
        </Section>

        <p style={{ fontSize: 13, color: 'rgba(246,241,228,0.7)' }}>
          See also our <Link to="/privacy" style={{ color: 'var(--gr-cream)', textDecoration: 'underline' }}>Privacy &amp; Cookies Policy</Link>.
        </p>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gr-cream)', marginBottom: 10 }}>{title}</h2>
      <div className="gr-legal" style={{ fontSize: 14, color: 'rgba(246,241,228,0.78)', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  )
}
