import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--gr-midnight)', color: 'var(--gr-cream)', fontFamily: 'var(--f-body)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Back link */}
        <Link to="/" style={{ color: 'rgba(246,241,228,0.4)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 40 }}>
          ← Back to home
        </Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gr-cream)', marginBottom: 8 }}>
          Privacy Policy & Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(246,241,228,0.4)', marginBottom: 48 }}>
          George Rental · Effective date: 25 May 2026
        </p>

        <Section title="1. About George Rental">
          George Rental is a commercial property management platform serving tenants and property owners in Monrovia, Liberia. This policy explains how we collect, use, and protect your personal information when you use our website and mobile application.
        </Section>

        <Section title="2. Information We Collect">
          We collect the following information when you register or use our services:
          <ul>
            <li>Full name, email address, and phone number</li>
            <li>Lease information, store assignment, and rental history</li>
            <li>Payment submissions and uploaded proof of payment images</li>
            <li>Maintenance requests and related communications</li>
            <li>Login activity and session data</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          Your information is used exclusively to:
          <ul>
            <li>Manage your lease, payments, and receipts</li>
            <li>Send email notifications about payment status and account activity</li>
            <li>Communicate with you regarding your property or lease</li>
            <li>Improve our platform and resolve technical issues</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          We do not sell, rent, or share your personal information with any third parties for marketing or commercial purposes. Your data may be accessed by authorized George Rental staff for the purposes described above. We use Supabase (a secure cloud database provider) to store your data in compliance with industry security standards.
        </Section>

        <Section title="5. Payment Information">
          We do not store bank account numbers or mobile money PINs. Payment proofs (screenshots/photos) you upload are stored securely and used only for verification by George Rental management.
        </Section>

        <Section title="6. Data Security">
          We implement technical and organizational measures to protect your personal data against unauthorized access, loss, or misuse. All data is transmitted over encrypted (HTTPS) connections.
        </Section>

        <Section title="7. Your Rights">
          You have the right to:
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate or incomplete data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for data processing (may affect service availability)</li>
          </ul>
          To exercise these rights, contact us using the details below.
        </Section>

        <Section title="8. Terms of Use">
          By using George Rental, you agree to:
          <ul>
            <li>Provide accurate and truthful information</li>
            <li>Use the platform only for legitimate lease and payment management</li>
            <li>Not share your login credentials with anyone</li>
            <li>Not attempt to access accounts or data that are not yours</li>
          </ul>
          George Rental reserves the right to suspend or terminate access for violations of these terms.
        </Section>

        <Section title="9. Cookies & Local Storage">
          Our web app uses local storage to maintain your login session. No third-party advertising or tracking cookies are used.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this policy from time to time. Significant changes will be communicated via email or an in-app notice. Continued use of the platform after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="11. Contact Us">
          <span>
            George Rental<br />
            Bob Taylor Road, Red Light, Paynesville, Monrovia, Liberia<br />
            📞 +231 88 605 5575<br />
            ✉️ eg8217178@gmail.com
          </span>
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gr-cream)', marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'rgba(246,241,228,0.55)', lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  )
}
