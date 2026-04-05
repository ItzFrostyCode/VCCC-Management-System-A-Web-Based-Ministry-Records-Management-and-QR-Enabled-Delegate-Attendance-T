// ── Supabase config ────────────────────────
const SUPABASE_URL  = 'https://wfeeoojneyuoeutzndie.supabase.co'
// Using the modern publishable key. 
// NOTE: Secrets (sb_secret_...) must NEVER be placed in client-side code.
const SUPABASE_ANON = 'sb_publishable_zOwCaEW4IE_isQ321B9UyQ_4SuHdom-'

// ── Init client ─────────────────────────────
// Because we are using ES modules now, ensure supabase.min.js handles global 'supabase'
const { createClient } = window.supabase
export const db = createClient(SUPABASE_URL, SUPABASE_ANON)

console.log('VCCC is now connected to LIVE Supabase Database')

