// Supabase Edge Function — reset-two-step
// Recovery for a tenant who lost the phone with their authenticator app.
// Only the owner (signed in WITH two-step) may call it, and only for a tenant:
//   { user_id }  →  removes that tenant's authenticators so they can sign in
//                   with their password and set two-step up again.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Sign-in strength recorded in the caller's token: 'aal2' = passed two-step
function tokenAal(token: string): string {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).aal ?? ''
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = await supabase.auth.getUser(token)
    if (!auth?.user) return json({ error: 'not signed in' }, 401)

    const { data: caller } = await supabase
      .from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
    if (caller?.role !== 'owner' || tokenAal(token) !== 'aal2') return json({ error: 'not allowed' }, 403)

    const text = await req.text()
    const { user_id } = text?.trim() ? JSON.parse(text) : {}
    if (typeof user_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user_id)) return json({ error: 'missing user_id' }, 400)

    const { data: target } = await supabase
      .from('profiles').select('role').eq('id', user_id).maybeSingle()
    if (!target) return json({ error: 'user not found' }, 404)
    // The owner's own authenticator is reset from the Supabase dashboard only
    if (target.role !== 'tenant') return json({ error: 'only tenant accounts can be reset here' }, 403)

    const { data: factors, error } = await supabase.auth.admin.mfa.listFactors({ userId: user_id })
    if (error) throw error

    let removed = 0
    for (const f of factors?.factors ?? []) {
      const { error: delErr } = await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: user_id })
      if (delErr) throw delErr
      removed++
    }
    return json({ ok: true, removed })
  } catch (err) {
    console.error(err)
    return json({ error: 'reset failed' }, 500)
  }
})
