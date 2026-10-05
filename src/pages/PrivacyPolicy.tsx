import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gr-midnight)', color: 'var(--gr-cream)', fontFamily: 'var(--f-body)' }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back link */}
        <Link to="/" style={{ color: 'rgba(246,241,228,0.7)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
          ← Back to home
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gr-cream)', marginBottom: 8 }}>
          Privacy &amp; Cookies Policy
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(246,241,228,0.7)', marginBottom: 48 }}>
          George Rental · Effective date: 5 October 2026
        </p>

        <Section title="1. Who is responsible for your information">
          George Rental manages commercial store rentals in Monrovia, Liberia, and is responsible for the personal information collected through this website and the George Rental mobile app. Contact details are at the end of this page.
        </Section>

        <Section title="2. Information we collect">
          We collect only what we need to handle rental requests and manage tenancies:
          <ul>
            <li><strong>When you send a request for a store:</strong> your name, phone number, and (if you choose to give them) your email and message</li>
            <li><strong>When you create an account:</strong> your name, email, phone number and a password (stored in scrambled form; we cannot read it)</li>
            <li><strong>If you become a tenant:</strong> your store, business name and type, lease dates and rent, rental agreement, rent payments you report, the proof of payment you upload, and maintenance requests</li>
          </ul>
          We do not ask for or store mobile money PINs, bank card numbers or bank passwords.
        </Section>

        <Section title="3. How we use it">
          <ul>
            <li>To reply to your rental request</li>
            <li>To manage your lease, check your rent payments and issue receipts</li>
            <li>To handle maintenance requests</li>
            <li>To send emails about your account: confirmation, password reset, payment status and rent reminders</li>
          </ul>
          We do not use your information for advertising and we do not sell it.
        </Section>

        <Section title="4. Who can see it">
          Your information is seen by George Rental's owner and office staff. It is not public: payment proofs and rental agreements can only be opened by you and by the office. We use these service providers to run the website, and they process information on our behalf:
          <ul>
            <li><strong>Supabase</strong> — stores the database, files and sign-in system</li>
            <li><strong>Vercel</strong> — hosts the website; like any web host, it sees your IP address when you visit</li>
            <li><strong>Google (Gmail)</strong> — delivers our emails to you</li>
            <li><strong>Google Fonts</strong> — supplies the lettering used on the site; your browser contacts Google to download it</li>
            <li><strong>Mapbox</strong> — draws the map on the owner's dashboard only</li>
          </ul>
          These providers may store information on servers outside Liberia. We may also disclose information where the law requires it.
        </Section>

        <Section title="5. Cookies and similar storage">
          This website does not use advertising or analytics cookies and does not track you across other sites. When you sign in, your browser keeps a sign-in token in its local storage so you stay signed in; it is removed when you sign out. Because this storage is strictly necessary for signing in, we do not show a cookie banner. Your sign-in provider and web host may set technical cookies needed for security.
        </Section>

        <Section title="6. How long we keep it">
          Rental requests are kept while they are being handled and for a reasonable period afterwards. Tenant, lease and payment records are kept for the length of the tenancy and afterwards for as long as needed for accounting and legal purposes. You can ask us to delete information we no longer need.
        </Section>

        <Section title="7. Keeping it safe">
          All connections to the website are encrypted (HTTPS). Access to records is restricted so each tenant can see only their own, and uploaded proofs and agreements are kept in private storage. No system is perfectly secure; if we learn of a breach affecting your information we will tell you.
        </Section>

        <Section title="8. Your rights">
          You can ask us to:
          <ul>
            <li>Show you the personal information we hold about you</li>
            <li>Correct anything that is wrong or incomplete</li>
            <li>Delete your account and information we no longer need to keep</li>
            <li>Stop contacting you about a rental request</li>
          </ul>
          Contact us using the details below and we will respond. If you are not satisfied with our answer you may complain to the relevant authority in Liberia.
        </Section>

        <Section title="9. Children">
          This website is for people renting business premises and is not intended for anyone under 18.
        </Section>

        <Section title="10. Changes to this policy">
          We may update this policy. The effective date at the top shows the latest version. Significant changes will be announced by email or a notice on the website.
        </Section>

        <Section title="11. Contact us">
          <span>
            George Rental<br />
            Bob Taylor Road, Red Light, Paynesville, Monrovia, Liberia<br />
            Phone: +231 88 605 5575 / +231 77 056 7682<br />
            Email: eg8217178@gmail.com
          </span>
        </Section>

        <p style={{ fontSize: 13, color: 'rgba(246,241,228,0.7)' }}>
          See also our <Link to="/terms" style={{ color: 'var(--gr-cream)', textDecoration: 'underline' }}>Terms of Use &amp; Refund Policy</Link>.
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
