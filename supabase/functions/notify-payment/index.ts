// Supabase Edge Function — notify-payment
// Called directly from the frontend after payment events.
// Caller must be signed in: the owner, or the tenant who owns the payment
// (tenants may only announce their own new submission).

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

function periodRangeLabel(startMonth: string | null, count: number): string {
  if (!startMonth) return 'this month'
  if (count <= 1) return new Date(startMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const endMonth = addMonthsYM(startMonth, count - 1)
  const start = new Date(startMonth + '-01').toLocaleDateString('en-US', { month: 'short' })
  const end   = new Date(endMonth   + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `${start} – ${end} (${count} months)`
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight — browser sends OPTIONS before the real POST
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    // Safely parse body — req.json() throws if body is empty
    const text = await req.text()
    if (!text?.trim()) {
      return new Response('empty body', { status: 400, headers: CORS })
    }
    const { payment_id, action } = JSON.parse(text)
    if (!payment_id || !action) {
      return new Response('missing payment_id or action', { status: 400, headers: CORS })
    }
    if (!['submitted', 'confirmed', 'rejected'].includes(action)) {
      return new Response('unknown action', { status: 400, headers: CORS })
    }

    const caller = await getCaller(req)
    if (!caller) return new Response('not signed in', { status: 401, headers: CORS })

    // Fetch full payment details
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        tenant:profiles!payments_tenant_id_fkey(full_name, email),
        lease:leases(lease_code, store:stores(code, name))
      `)
      .eq('id', payment_id)
      .single()

    if (error || !payment) {
      return new Response('payment not found', { status: 404, headers: CORS })
    }

    const isOwner = caller.role === 'owner'
    if (!isOwner && !(action === 'submitted' && payment.tenant_id === caller.id)) {
      return new Response('not allowed', { status: 403, headers: CORS })
    }
    // Never email "confirmed"/"rejected" unless that is the payment's real status
    if (action !== 'submitted' && payment.status !== action) {
      return new Response('payment is not in that state', { status: 409, headers: CORS })
    }

    const tenantEmail = payment.tenant?.email
    const tenantName  = esc(payment.tenant?.full_name ?? 'Tenant')
    const storeName   = esc((payment.lease?.store as any)?.name ?? 'your store')
    const storeCode   = esc((payment.lease?.store as any)?.code ?? '')
    const amount      = `$${Number(payment.amount_usd).toLocaleString()}`
    const amountLrd   = `L$${Number(payment.amount_lrd ?? 0).toLocaleString()}`
    const monthsCount = payment.months_count ?? 1
    const period      = periodRangeLabel(payment.period_month, monthsCount)

    // ── 1. New payment submitted → notify owner ─────────────────
    if (action === 'submitted') {
      const { data: owner } = await supabase
        .from('profiles').select('email').eq('role', 'owner').limit(1).single()

      if (owner?.email) {
        await sendEmail(
          owner.email,
          `💳 New payment submitted — ${tenantName} (${storeCode})`,
          emailWrapper(`
            <h2 style="margin:0 0 6px">New Payment Submitted 💳</h2>
            <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
              <strong>${tenantName}</strong> submitted a payment of <strong>${amount}</strong> (${amountLrd})
              for <strong>${period}</strong> at <strong>${storeName} (${storeCode})</strong>.
            </p>
            <table style="width:100%;border-collapse:collapse;background:#F9F7F3;border-radius:10px;overflow:hidden;margin-bottom:24px">
              <tr><td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #E5E0D5">Method</td>
                  <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #E5E0D5;text-align:right">
                    ${payment.method === 'mtn_momo' ? 'MTN MoMo' : 'Bank Transfer'}
                  </td></tr>
              ${payment.transaction_ref ? `<tr><td style="padding:10px 16px;font-size:13px;color:#6B6560">Transaction Ref</td>
                  <td style="padding:10px 16px;font-size:13px;font-family:monospace;font-weight:600;text-align:right">${esc(payment.transaction_ref)}</td></tr>` : ''}
            </table>
            <a href="https://george-rental.vercel.app/owner/payments" style="${btnStyle}">Review payment →</a>
          `)
        )
      }
    }

    // ── 2. Payment confirmed → notify tenant ────────────────────
    if (action === 'confirmed') {
      if (!tenantEmail) return new Response('no tenant email', { status: 200, headers: CORS })

      await sendEmail(
        tenantEmail,
        `✅ Payment confirmed — ${period} | George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 6px;color:#2FB875">Payment Confirmed ✅</h2>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${tenantName}</strong>, your rent for <strong>${period}</strong>
            at <strong>${storeName}</strong> has been confirmed.
          </p>
          <table style="width:100%;border-collapse:collapse;background:#F7FCF9;border:1px solid #C3EDD6;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <tr><td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #C3EDD6">Amount paid</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;border-bottom:1px solid #C3EDD6;text-align:right">${amount}</td></tr>
            <tr><td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #C3EDD6">LRD equivalent</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #C3EDD6;text-align:right">${amountLrd}</td></tr>
            <tr><td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #C3EDD6">Period</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #C3EDD6;text-align:right">${period}</td></tr>
            <tr><td style="padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #C3EDD6">Store</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #C3EDD6;text-align:right">${storeCode} · ${storeName}</td></tr>
            ${payment.receipt_number ? `<tr><td style="padding:10px 16px;font-size:13px;color:#6B6560">Receipt #</td>
                <td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2FB875;font-family:monospace;text-align:right">${payment.receipt_number}</td></tr>` : ''}
          </table>
          ${payment.notes ? `<div style="background:#F9F7F3;border-radius:8px;padding:12px 16px;font-size:13px;color:#6B6560;margin-bottom:20px"><strong>Note from landlord:</strong> ${esc(payment.notes)}</div>` : ''}
          <a href="https://george-rental.vercel.app/tenant/receipts" style="${btnStyle}">View your receipts →</a>
        `)
      )
    }

    // ── 3. Payment rejected → notify tenant ─────────────────────
    if (action === 'rejected') {
      if (!tenantEmail) return new Response('no tenant email', { status: 200, headers: CORS })

      await sendEmail(
        tenantEmail,
        `❌ Payment not confirmed — ${period} | George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 6px;color:#D11F2C">Payment Not Confirmed</h2>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${tenantName}</strong>, your payment for <strong>${period}</strong>
            at <strong>${storeName}</strong> could not be confirmed.
          </p>
          ${payment.notes ? `
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#7F1D1D">
            <strong>Reason:</strong> ${esc(payment.notes)}
          </div>` : ''}
          <p style="font-size:14px;color:#6B6560;line-height:1.6;margin:0 0 24px">
            Please resubmit with the correct proof, or contact the office on <strong>+231 88 605 5575</strong>.
          </p>
          <a href="https://george-rental.vercel.app/tenant/pay" style="${btnStyle}">Resubmit payment →</a>
        `)
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
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
