import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Payment proofs and lease agreements live in PRIVATE buckets. The database
// still stores the storage URL, so pull the bucket + path back out of it and
// ask Supabase for a short-lived signed link (RLS decides who may get one).
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/)
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null
}

export async function getSignedUrl(url: string): Promise<string> {
  const ref = parseStorageUrl(url)
  if (!ref) return url
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
