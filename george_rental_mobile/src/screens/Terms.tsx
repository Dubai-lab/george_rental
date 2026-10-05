import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TERMS_KEY = 'gr_terms_agreed_v1'

export async function hasAgreedToTerms(): Promise<boolean> {
  const v = await AsyncStorage.getItem(TERMS_KEY)
  return v === 'true'
}

export async function saveTermsAgreement(): Promise<void> {
  await AsyncStorage.setItem(TERMS_KEY, 'true')
}

const C = {
  midnight: '#060914',
  navy:     '#0B1120',
  crimson:  '#D11F2C',
  cream:    '#F6F1E4',
  paper:    '#F9F7F3',
  stone:    '#6B6560',
  line:     '#E5E0D5',
}

interface Props { onAgree: () => void }

export default function TermsScreen({ onAgree }: Props) {
  const [agreeing, setAgreeing] = useState(false)

  async function handleAgree() {
    setAgreeing(true)
    await saveTermsAgreement()
    onAgree()
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={{ width: 14, height: 20, borderRadius: 2, backgroundColor: 'rgba(246,241,228,0.35)' }} />
          <View style={{ width: 11, height: 15, borderRadius: 2, backgroundColor: 'rgba(246,241,228,0.2)', marginHorizontal: 3 }} />
          <View style={{ width: 9, height: 12, borderRadius: 2, backgroundColor: C.crimson }} />
        </View>
        <Text style={styles.headerTitle}>Terms & Privacy Policy</Text>
        <Text style={styles.headerSub}>Please read and agree to continue using George Rental</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Section title="1. About This App">
          The George Rental app is a tenant portal for renters of George Rental commercial properties located in Monrovia, Liberia. It allows tenants to view lease details, submit rent payments, and log maintenance requests.
        </Section>

        <Section title="2. Eligibility">
          Access to this app is restricted to verified tenants of George Rental. You must have an active lease agreement with George Rental to use this app. Sharing your account credentials with others is strictly prohibited.
        </Section>

        <Section title="3. Payment Submissions">
          Payments submitted through this app are reviewed and confirmed by George Rental management. Submission of a payment does not guarantee confirmation. Only a written confirmation from management constitutes an accepted payment. George Rental is not responsible for payments sent to incorrect accounts or phone numbers provided by the tenant.
        </Section>

        <Section title="4. Your Responsibilities">
          You are responsible for:{'\n'}
          • Keeping your login credentials secure{'\n'}
          • Providing accurate personal and payment information{'\n'}
          • Uploading clear and legible proof of payment{'\n'}
          • Notifying us immediately of any unauthorized access to your account
        </Section>

        <Section title="5. Data We Collect">
          We collect and store:{'\n'}
          • Your name, email address, and phone number{'\n'}
          • Lease information and payment history{'\n'}
          • Maintenance requests and uploaded images{'\n'}
          • Device usage data for app functionality
        </Section>

        <Section title="6. How We Use Your Data">
          Your data is used exclusively to:{'\n'}
          • Manage your lease and payment records{'\n'}
          • Send payment receipts and notifications{'\n'}
          • Communicate about your account and property{'\n'}
          • Improve the app experience
        </Section>

        <Section title="7. Data Sharing">
          We do not sell or share your personal data with third parties. Your data is stored on secure cloud infrastructure (Supabase) and is accessible only to authorized George Rental staff.
        </Section>

        <Section title="8. Your Rights">
          You have the right to:{'\n'}
          • Request a copy of your personal data{'\n'}
          • Request correction of inaccurate information{'\n'}
          • Request deletion of your account and data{'\n'}
          To exercise these rights, contact us at the details below.
        </Section>

        <Section title="9. Account Termination">
          George Rental reserves the right to suspend or terminate access to this app for tenants who violate these terms, provide false information, or whose lease has ended.
        </Section>

        <Section title="10. Contact">
          George Rental — Bob Taylor Road, Red Light, Paynesville, Monrovia, Liberia{'\n'}
          📞 +231 88 605 5575{'\n'}
          ✉️ eg8217178@gmail.com
        </Section>

        <Text style={styles.effectiveDate}>Effective date: 25 May 2026</Text>
      </ScrollView>

      {/* Agree button */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>By tapping "I Agree" you confirm you have read and accept these Terms and Privacy Policy.</Text>
        <TouchableOpacity
          style={[styles.agreeBtn, agreeing && { opacity: 0.7 }]}
          onPress={handleAgree}
          disabled={agreeing}
        >
          {agreeing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.agreeBtnText}>I Agree - Continue</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.midnight },
  header:        { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, alignItems: 'center' },
  logoRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: C.cream, marginBottom: 6 },
  headerSub:     { fontSize: 13, color: 'rgba(246,241,228,0.5)', textAlign: 'center', lineHeight: 18 },
  scroll:        { flex: 1, backgroundColor: C.paper },
  scrollContent: { padding: 20, paddingBottom: 32 },
  section:       { marginBottom: 22 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: C.midnight, marginBottom: 6 },
  sectionBody:   { fontSize: 13, color: C.stone, lineHeight: 21 },
  effectiveDate: { fontSize: 11, color: 'rgba(107,101,96,0.55)', textAlign: 'center', marginTop: 10 },
  footer:        {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
    borderTopWidth: 1, borderColor: C.line,
  },
  footerNote:    { fontSize: 11, color: C.stone, textAlign: 'center', marginBottom: 14, lineHeight: 17 },
  agreeBtn:      {
    height: 52, backgroundColor: C.crimson, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.crimson, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  agreeBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
})
