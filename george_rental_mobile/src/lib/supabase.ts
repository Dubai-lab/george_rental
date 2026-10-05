import { AppState } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { secureStorage } from './secureStorage'

// Public project address + public (anon) key. These are safe to ship inside
// the app: every table is protected by row-level security on the server.
// NEVER put the service-role key in this app.
export const SUPABASE_URL  = 'https://upzuvkmycwfiparfgbck.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwenV2a215Y3dmaXBhcmZnYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNTYyNDIsImV4cCI6MjEwNjczMjI0Mn0.529X3maXFHlh9E7WuVD2IJqBHolDBvnnCZYhu4FsEuQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Only refresh the session while the app is on screen (Supabase's guidance for
// React Native — avoids refresh attempts while the app is suspended).
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
