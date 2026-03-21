// ── Supabase config ────────────────────────
const SUPABASE_URL  = 'https://wfeeoojneyuoeutzndie.supabase.co'
const SUPABASE_ANON = 'sb_publishable_zOwCaEW4IE_isQ321B9UyQ_4SuHdom-'

// ── Init client ─────────────────────────────
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON)

console.log('🚀 VCCC is now connected to LIVE Supabase Database')

// ── Auth helpers ─────────────────────────────────────────
// Bypassed for easy CRUD as requested
async function getUser() {
  return { email: 'admin@vccc.local', id: '0000-0000-0000-0000' }
}

async function signIn(email, password) {
  // Mock login token for UI consistency
  localStorage.setItem('sb-vccc-auth-token', 'test-token')
  return { data: { user: await getUser() }, error: null }
}

async function signOut() {
  localStorage.removeItem('sb-vccc-auth-token')
  console.log('Signed out (auth bypassed)')
}

// ── Auth guard ───────────────────────────────────────────
async function requireAuth() {
  // Always return the mock user, no login page exists
  return await getUser()
}
// Function to toggle test mode
function toggleTestMode() {
  const current = localStorage.getItem('vccc_test_mode') === 'true'
  const target = !current
  localStorage.setItem('vccc_test_mode', String(target))
  alert(`Test Mode (LocalStorage) is now ${target ? 'ON' : 'OFF'}.\n\nOffline testing is now active.`)
  window.location.reload()
}

// Exposed for dev console
window.toggleVCCCTestMode = toggleTestMode