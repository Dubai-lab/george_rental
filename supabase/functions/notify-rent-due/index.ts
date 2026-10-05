// Supabase Edge Function — notify-rent-due
// Called by owner clicking "Send Reminders" in the dashboard.
// For each active lease, calculates when rent is next due based on the
// last confirmed payment's coverage end date, and emails tenants whose
// rent is due within `days_ahead` (default 7). Also emails overdue tenants.
// Uses SpaceMail SMTP — no third-party email service.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? 465)
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const FROM      = `George Rental <${SMTP_USER}>`

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Security helpers ─────────────────────────────────────────────────────────
// Escape anything user-supplied before it goes into email HTML.
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

// Who is calling? Returns their profile, or null for anonymous / invalid tokens.
async function getCaller(req: Request): Promise<{ id: string; role: string } | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await supabase.auth.getUser(token)
  if (!data?.user) return null
  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('id', data.user.id).maybeSingle()
  return profile
}


const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  })
  await transporter.sendMail({ from: FROM, to, subject, html })
}

function addMonthsYM(ym: string, n: number): string {
  const d = new Date(ym + '-01')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 7)
}

// Returns the first day of the month after coverage ends (i.e., when next payment is due)
function nextDueYM(lastPaymentStartMonth: string, monthsCount: number): string {
  return addMonthsYM(lastPaymentStartMonth, monthsCount)
}

function daysBetween(fromYM: string, toDate: Date): number {
  const from = new Date(fromYM + '-01')
  return Math.round((from.getTime() - toDate.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtMonthFull(ym: string): string {
  return new Date(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // Owner only — this emails every tenant
    const caller = await getCaller(req)
    if (!caller) return new Response('not signed in', { status: 401, headers: CORS })
    if (caller.role !== 'owner') return new Response('not allowed', { status: 403, headers: CORS })

    const text = await req.text()
    const { days_ahead = 7 } = text?.trim() ? JSON.parse(text) : {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all active leases with tenant profile and store
    const { data: leases, error: leaseErr } = await supabase
      .from('leases')
      .select(`
        id,
        monthly_rent_usd,
        tenant:profiles!leases_tenant_id_fkey(id, full_name, email),
        store:stores(code, name)
      `)
      .eq('status', 'active')

    if (leaseErr) throw leaseErr
    if (!leases?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // For each lease, get the most recent confirmed payment
    const leaseIds = leases.map((l: any) => l.id)
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select('lease_id, period_month, months_count')
      .in('lease_id', leaseIds)
      .eq('status', 'confirmed')
      .order('period_month', { ascending: false })

    if (payErr) throw payErr

    // Build a map: lease_id → latest confirmed payment
    const lastPaymentMap: Record<string, { period_month: string; months_count: number }> = {}
    for (const p of (payments ?? [])) {
      if (!lastPaymentMap[p.lease_id]) {
        lastPaymentMap[p.lease_id] = { period_month: p.period_month, months_count: p.months_count ?? 1 }
      }
    }

    let sent = 0
    const results: Array<{ tenant: string; dueMonth: string; status: 'due_soon' | 'overdue' | 'skipped' }> = []

    for (const lease of leases as any[]) {
      const tenantEmail = lease.tenant?.email
      const tenantName  = esc(lease.tenant?.full_name ?? 'Tenant')
      const storeName   = esc(lease.store?.name ?? 'your store')
      const storeCode   = esc(lease.store?.code ?? '')
      const rent        = `$${Number(lease.monthly_rent_usd).toLocaleString()}`

      if (!tenantEmail) continue

      const lastPay = lastPaymentMap[lease.id]
      let dueYM: string

      if (!lastPay) {
        // No confirmed payments at all — current month is due
        dueYM = today.toISOString().slice(0, 7)
      } else {
        dueYM = nextDueYM(lastPay.period_month, lastPay.months_count)
      }

      const daysUntilDue = daysBetween(dueYM, today)

      // daysUntilDue < 0  → overdue (due date already passed)
      // daysUntilDue = 0  → due today
      // daysUntilDue ≤ days_ahead → due soon
      if (daysUntilDue > days_ahead) {
        results.push({ tenant: tenantName, dueMonth: dueYM, status: 'skipped' })
        continue
      }

      const isOverdue   = daysUntilDue < 0
      const dueMonthFmt = fmtMonthFull(dueYM)
      const subject     = isOverdue
        ? `⚠️ Rent overdue — ${dueMonthFmt} | George Rental`
        : `📅 Rent reminder — ${dueMonthFmt} | George Rental`

      const urgencyColor = isOverdue ? '#D11F2C' : '#C89A30'
      const urgencyBg    = isOverdue ? '#FEF2F2' : '#FFFBEB'
      const urgencyBdr   = isOverdue ? '#FECACA' : '#FDE68A'

      const overdueMessage = isOverdue
        ? `Your rent of <strong>${rent}</strong> for <strong>${dueMonthFmt}</strong> was due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''} ago and is now <strong>overdue</strong>.`
        : daysUntilDue === 0
          ? `Your rent of <strong>${rent}</strong> for <strong>${dueMonthFmt}</strong> is due <strong>today</strong>.`
          : `Your rent of <strong>${rent}</strong> for <strong>${dueMonthFmt}</strong> is due in <strong>${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}</strong>.`

      await sendEmail(
        tenantEmail,
        subject,
        emailWrapper(`
          <h2 style="margin:0 0 6px;color:${urgencyColor}">${isOverdue ? 'Rent Overdue ⚠️' : 'Rent Reminder 📅'}</h2>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${tenantName}</strong>,
          </p>
          <div style="background:${urgencyBg};border:1px solid ${urgencyBdr};border-radius:10px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#374151;line-height:1.6">
            ${overdueMessage}
          </div>
          <table style="width:100%;border-collapse:collapse;background:#F9F7F3;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #E5E0D5">Store</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #E5E0D5;text-align:right">${storeCode} · ${storeName}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #E5E0D5">Monthly rent</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #E5E0D5;text-align:right">${rent}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#6B6560">Period due</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:600;text-align:right">${dueMonthFmt}</td>
            </tr>
          </table>
          <a href="https://george-rental.vercel.app/tenant/pay" style="${btnStyle}">Pay rent now →</a>
          <p style="margin-top:20px;font-size:13px;color:#6B6560;line-height:1.6">
            You can also pay multiple months at once to avoid future reminders.
            Contact the office if you have any questions.
          </p>
        `)
      )

      sent++
      results.push({ tenant: tenantName, dueMonth: dueYM, status: isOverdue ? 'overdue' : 'due_soon' })
    }

    return new Response(JSON.stringify({ ok: true, sent, results }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'failed to send' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

const btnStyle = 'display:inline-block;padding:12px 24px;background:#D11F2C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px'

function emailWrapper(body: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#060914">
    <div style="background:#060914;padding:24px 32px;border-radius:12px 12px 0 0">
      <span style="font-size:20px;font-weight:700;color:#F6F1E4">George<span style="color:#D11F2C">Rental</span></span>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #E5E0D5;border-top:none;border-radius:0 0 12px 12px">
      ${body}
      <p style="margin-top:32px;padding-top:20px;border-top:1px solid #E5E0D5;font-size:12px;color:#9E9893;line-height:1.6">
        George Rental · Broad Street, Central Monrovia, Liberia<br>
        +231 88 605 5575 / +231 77 056 7682 · eg8217178@gmail.com
      </p>
    </div>
  </div>`
}
