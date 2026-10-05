import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Payment proofs and lease agreements live in PRIVATE buckets. The database
// still stores the storage URL, so pull the bucket + path back out of it and
// ask Supabase for a short-lived signed link (RLS decides who may get one).
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/)
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null
}

const STORAGE_ORIGIN = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, '')

export async function getSignedUrl(url: string): Promise<string> {
  // The stored link is written by the uploader, so treat it as untrusted:
  // only links into OUR storage are ever opened (never javascript:, data:, or
  // another website).
  const ref = url.startsWith(`${STORAGE_ORIGIN}/storage/v1/object/`) ? parseStorageUrl(url) : null
  if (!ref) throw new Error('Not a George Rental file')
  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

export function useSignedUrl(url: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', url],
    enabled: !!url,
    staleTime: 50 * 60 * 1000,
    queryFn: () => getSignedUrl(url!),
  })
}

// Opens the tab first (inside the click) so pop-up blockers allow it.
export async function openPrivateFile(url: string) {
  const win = window.open('', '_blank')
  try {
    const signed = await getSignedUrl(url)
    if (win) win.location.href = signed
    else window.location.href = signed
  } catch {
    win?.close()
    alert('Could not open this file. Please try again.')
  }
}
