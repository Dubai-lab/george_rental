// Supabase Edge Function — notify-enquiry
// Uses SpaceMail SMTP (no third-party email service)
// Called directly from the client after a store_enquiries insert.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? 587)
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const FROM      = `George Rental <${SMTP_USER}>`

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  await transporter.sendMail({ from: FROM, to, subject, html })
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight — browser sends OPTIONS before the real POST
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { store, enquiry } = await req.json()
    // store: { code, name, address, rent_usd }
    // enquiry: { name, email, phone, message }

    if (!store || !enquiry) {
      return new Response('missing payload', { status: 400, headers: CORS })
    }

    // 1. Notify owner
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'owner')
      .limit(1)
      .single()

    if (owner?.email) {
      await sendEmail(
        owner.email,
        `📩 New enquiry — ${store.code} ${store.name} | George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 6px">New Store Enquiry 📩</h2>
          <p style="color:#6B6560;font-size:14px;margin:0 0 20px">
            Someone is interested in <strong>${store.name} (${store.code})</strong>
          </p>

          <table style="width:100%;border-collapse:collapse;background:#F9F7F3;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <tr>
              <td style="${tdKey}">Full name</td>
              <td style="${tdVal}">${enquiry.name}</td>
            </tr>
            ${enquiry.email ? `<tr><td style="${tdKey}">Email</td><td style="${tdVal}">${enquiry.email}</td></tr>` : ''}
            ${enquiry.phone ? `<tr><td style="${tdKey}">Phone</td><td style="${tdVal}">${enquiry.phone}</td></tr>` : ''}
            ${enquiry.message ? `<tr><td style="${tdKey}">Message</td><td style="${tdVal};white-space:pre-wrap">${enquiry.message}</td></tr>` : ''}
          </table>

          <div style="background:#fff;border:1px solid #E5E0D5;border-radius:10px;padding:14px 18px;margin-bottom:24px">
            <div style="font-size:12px;color:#9E9893;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Store details</div>
            <div style="font-size:15px;font-weight:700;color:#060914">${store.name} <span style="font-family:monospace;font-size:12px;color:#6B6560">${store.code}</span></div>
            ${store.address ? `<div style="font-size:13px;color:#6B6560;margin-top:2px">📍 ${store.address}</div>` : ''}
            <div style="font-size:14px;color:#060914;font-weight:600;margin-top:6px">$${Number(store.rent_usd).toLocaleString()}/month</div>
          </div>

          <a href="https://george-rental.vercel.app/owner/enquiries" style="${btnStyle}">View all enquiries →</a>
        `)
      )
    }

    // 2. Confirm to enquirer (only if they provided an email)
    if (enquiry.email) {
      await sendEmail(
        enquiry.email,
        `Your enquiry for ${store.name} — George Rental`,
        emailWrapper(`
          <h2 style="margin:0 0 6px">Enquiry Received ✅</h2>
          <p style="color:#6B6560;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hi <strong>${enquiry.name}</strong>, thank you for your interest in
            <strong>${store.name}</strong>. We have received your enquiry and will
            get back to you shortly.
          </p>

          <div style="background:#F9F7F3;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <div style="font-size:12px;color:#9E9893;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Store you enquired about</div>
            <div style="font-size:16px;font-weight:700;color:#060914">${store.name}</div>
            <div style="font-size:13px;font-family:monospace;color:#6B6560;margin-top:2px">${store.code}</div>
            ${store.address ? `<div style="font-size:13px;color:#6B6560;margin-top:4px">📍 ${store.address}</div>` : ''}
            <div style="font-size:15px;font-weight:700;color:#D11F2C;margin-top:8px">$${Number(store.rent_usd).toLocaleString()}<span style="font-size:12px;font-weight:400;color:#6B6560">/month</span></div>
          </div>

          <p style="font-size:14px;color:#6B6560;line-height:1.6;margin:0 0 24px">
            If you have any questions in the meantime, feel free to reach us directly:<br>
            📞 <strong>+231 88 605 5575 / +231 77 056 7682</strong><br>
            ✉️ <strong>eg8217178@gmail.com</strong>
          </p>

          <a href="https://george-rental.vercel.app/stores" style="${btnStyle}">Browse more stores →</a>
        `)
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS })
  }
})

const tdKey = 'padding:10px 16px;font-size:13px;color:#6B6560;border-bottom:1px solid #E5E0D5;white-space:nowrap'
const tdVal = 'padding:10px 16px;font-size:13px;font-weight:600;color:#060914;border-bottom:1px solid #E5E0D5'
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
