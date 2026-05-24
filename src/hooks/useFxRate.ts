import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useFxRate() {
  return useQuery({
    queryKey: ['fx-rate'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fx_rates')
        .select('rate, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.rate ?? 180
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function toUsd(lrd: number, rate: number): number {
  return Math.round((lrd / rate) * 100) / 100
}

export function toLrd(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100
}
