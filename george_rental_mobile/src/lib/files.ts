import { supabase, SUPABASE_URL } from './supabase'

// Payment proofs and rental agreements are in PRIVATE storage. The database
// holds the file's storage address; to show it we ask the server for a
// short-lived signed link, which it only gives to the file's owner.
export async function getSignedUrl(url: string): Promise<string> {
  const m = url.startsWith(`${SUPABASE_URL}/storage/v1/object/`)
    ? url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/)
    : null
  if (!m) throw new Error('Not a George Rental file')
  const { data, error } = await supabase.storage.from(m[1]).createSignedUrl(decodeURIComponent(m[2]), 60 * 60)
  if (error) throw error
  return data.signedUrl
}
