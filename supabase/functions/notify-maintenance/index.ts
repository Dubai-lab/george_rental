// Supabase Edge Function — notify-maintenance
// Called from the app (not a webhook): { request_id, event }
//   event 'created'        — sent by the tenant who filed it → emails the owner
//   event 'status_changed' — sent by the owner               → emails the tenant

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
  if (!profile) return null
  // The owner only counts as owner when signed in with two-step (token 'aal2')
  let aal = ''
  try { aal = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal ?? '' } catch { /* ignore */ }
  if (profile.role === 'owner' && aal !== 'aal2') return { id: profile.id, role: 'owner-unverified' }
  return profile
}


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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const text = await req.text()
    const { request_id, event } = text?.trim() ? JSON.parse(text) : {}
    if (!request_id || !['created', 'status_changed'].includes(event)) {
      return new Response('missing request_id or event', { status: 400, headers: CORS })
    }

    const caller = await getCaller(req)
    if (!caller) return new Response('not signed in', { status: 401, headers: CORS })

    // Fetch full data
    const { data: req_ } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        tenant:profiles!maintenance_requests_tenant_id_fkey(full_name, email),
        store:stores(code, name)
      `)
      .eq('id', request_id)
      .single()

    if (!req_) return new Response('request not found', { status: 404, headers: CORS })

    const isOwner = caller.role === 'owner'
    if (event === 'created' && !isOwner && req_.tenant_id !== caller.id) {
      return new Response('not allowed', { status: 403, headers: CORS })
    }
    if (event === 'status_changed' && !isOwner) {
      return new Response('not allowed', { status: 403, headers: CORS })
    }

    const title       = esc(req_.title)
    const description = req_.description ? esc(req_.description) : ''

    const tenantEmail = req_.tenant?.email
    const tenantName  = esc(req_.tenant?.full_name ?? 'Tenant')
    const storeName   = esc(req_.store?.name ?? 'your store')
    const storeCode   = esc(req_.store?.code ?? '')

    // ── NEW request inserted → email owner ────────────────────
    if (event === 'created') {
      const { data: owner } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'owner')
        .limit(1)
        .single()

      if (owner?.email) {
        await sendEmail(
          owner.email,
          `🔧 New maintenance request — ${title} | George Rental`,
          emailWrapper(`
            <h2 style="margin:0 0 6px">New Maintenance Request 🔧</h2>
            <p style="color:#6B6560;font-size:14px;margin:0 0 20px">
              From <strong>${tenantName}</strong> at <strong>${storeName} (${storeCode})</strong>
            </p>
            <div style="background:#F9F7F3;border-left:4px solid #D11F2C;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px">
              <div style="font-size:16px;font-weight:700;color:#060914;margin-bottom:8px">${title}</div>
              ${description ? `<div style="font-size:14px;color:#6B6560;line-height:1.6">${description}</div>` : ''}
              <div style="margin-top:12px">${priorityBadge(req_.priority)}</div>
            </div>
            <a href="https://george-rental.vercel.app/owner/maintenance" style="${btnStyle}">View maintenance →</a>
          `)
        )
      }
    }

    // ── Status updated → email tenant ─────────────────────────
    if (event === 'status_changed' && req_.status !== 'open') {
      if (!tenantEmail) return new Response('no tenant email', { status: 200, headers: CORS })

      const isResolved  = req_.status === 'resolved'
      const statusLabel = isResolved ? 'Resolved ✅' : 'In Progress 🛠️'
      const statusColor = isResolved ? '#2FB875' : '#E9B949'
      const statusMsg   = isResolved
        ? `Great news! Your maintenance request has been resolved. Please check and let us know if you need further assistance.`
        : `Your maintenance request is now being worked on. We'll update you when it's resolved.`

      await sendEmail(
        tenantEmail,
        `${isResolved ? '✅' : '🛠️'} Maintenance update — ${title} | George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 10px">Maintenance Update</h2>
          <div style="display:inline-block;padding:4px 14px;border-radius:99px;background:${statusColor}22;color:${statusColor};font-size:13px;font-weight:600;margin-bottom:20px">
            ${statusLabel}
          </div>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${tenantName}</strong>, ${statusMsg}
          </p>
          <div style="background:#F9F7F3;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <div style="font-size:14px;font-weight:700;color:#060914;margin-bottom:4px">${title}</div>
            <div style="font-size:12px;color:#6B6560">${storeName} (${storeCode})</div>
          </div>
          <a href="https://george-rental.vercel.app/tenant/maintenance" style="${btnStyle}">View requests →</a>
        `)
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'failed to send' }), { status: 500, headers: CORS })
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
