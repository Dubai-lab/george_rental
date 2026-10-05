// Supabase Edge Function — notify-maintenance
// Uses your custom SpaceMail SMTP (no third-party service needed)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? 587)
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const FROM      = `George Rental <${SMTP_USER}>`

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  await transporter.sendMail({ from: FROM, to, subject, html })
}

function priorityBadge(p: string) {
  const color = p === 'high' ? '#D11F2C' : p === 'medium' ? '#E9B949' : '#6B6560'
  return `<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:${color}22;color:${color};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${p} priority</span>`
}

Deno.serve(async (req) => {
  try {
    const payload   = await req.json()
    const record    = payload.record
    const old       = payload.old_record
    const eventType = payload.type // INSERT or UPDATE

    if (!record) return new Response('no record', { status: 200 })

    // Fetch full data
    const { data: req_ } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email),
        store:stores(code, name)
      `)
      .eq('id', record.id)
      .single()

    if (!req_) return new Response('request not found', { status: 404 })

    const tenantEmail = req_.tenant?.email
    const tenantName  = req_.tenant?.full_name ?? 'Tenant'
    const storeName   = req_.store?.name ?? 'your store'
    const storeCode   = req_.store?.code ?? ''

    // ── NEW request inserted → email owner ────────────────────
    if (eventType === 'INSERT') {
      const { data: owner } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'owner')
        .limit(1)
        .single()

      if (owner?.email) {
        await sendEmail(
          owner.email,
          `🔧 New maintenance request — ${req_.title} | George Rental`,
          emailWrapper(`
            <h2 style="margin:0 0 6px">New Maintenance Request 🔧</h2>
            <p style="color:#6B6560;font-size:14px;margin:0 0 20px">
              From <strong>${tenantName}</strong> at <strong>${storeName} (${storeCode})</strong>
            </p>
            <div style="background:#F9F7F3;border-left:4px solid #D11F2C;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px">
              <div style="font-size:16px;font-weight:700;color:#060914;margin-bottom:8px">${req_.title}</div>
              ${req_.description ? `<div style="font-size:14px;color:#6B6560;line-height:1.6">${req_.description}</div>` : ''}
              <div style="margin-top:12px">${priorityBadge(req_.priority)}</div>
            </div>
            <a href="https://george-rental.vercel.app/owner/maintenance" style="${btnStyle}">View maintenance →</a>
          `)
        )
      }
    }

    // ── Status updated → email tenant ─────────────────────────
    if (eventType === 'UPDATE' && record.status !== old?.status) {
      if (!tenantEmail) return new Response('no tenant email', { status: 200 })

      const isResolved  = record.status === 'resolved'
      const statusLabel = isResolved ? 'Resolved ✅' : 'In Progress 🛠️'
      const statusColor = isResolved ? '#2FB875' : '#E9B949'
      const statusMsg   = isResolved
        ? `Great news! Your maintenance request has been resolved. Please check and let us know if you need further assistance.`
        : `Your maintenance request is now being worked on. We'll update you when it's resolved.`

      await sendEmail(
        tenantEmail,
        `${isResolved ? '✅' : '🛠️'} Maintenance update — ${req_.title} | George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 10px">Maintenance Update</h2>
          <div style="display:inline-block;padding:4px 14px;border-radius:99px;background:${statusColor}22;color:${statusColor};font-size:13px;font-weight:600;margin-bottom:20px">
            ${statusLabel}
          </div>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${tenantName}</strong>, ${statusMsg}
          </p>
          <div style="background:#F9F7F3;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <div style="font-size:14px;font-weight:700;color:#060914;margin-bottom:4px">${req_.title}</div>
            <div style="font-size:12px;color:#6B6560">${storeName} (${storeCode})</div>
          </div>
          <a href="https://george-rental.vercel.app/tenant/maintenance" style="${btnStyle}">View requests →</a>
        `)
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
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
