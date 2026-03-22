// ── Supabase config ────────────────────────
const SUPABASE_URL  = 'https://wfeeoojneyuoeutzndie.supabase.co'
const SUPABASE_ANON = 'sb_publishable_zOwCaEW4IE_isQ321B9UyQ_4SuHdom-'

// ── Init client ─────────────────────────────
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON)

console.log('🚀 VCCC is now connected to LIVE Supabase Database')

// ── Auth guard & helpers ──────────────────────────────────
async function requireAuth() {
  if (typeof authService !== 'undefined') {
    const isScannerPage = window.location.pathname.includes('scanner.html');
    
    if (!authService.isAuthenticated()) {
      if (isScannerPage) return null;
      const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = '/' + prefix + 'login.html';
      return null;
    }

    const user = authService.getCurrentUser();
    const sessionId = localStorage.getItem('vccc_session_id');

    // ── Check if session was "kicked out" by another device ──
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

    if (sessionId && isUUID(sessionId) && !isScannerPage) {
      try {
        const { data: session, error: sessErr } = await db
          .from('user_sessions')
          .select('active_flag')
          .eq('id', sessionId)
          .maybeSingle();


        if (sessErr) throw sessErr;

        // If session not found or inactive, log them out
        if (!session || session.active_flag === false) {
          authService.clearSession();
          const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
          window.location.href = '/' + prefix + 'login.html?expired=true';
          return null;
        }
      } catch (e) { 
        console.error('Session validation failed:', e); 
      }
    }


    // (Existing role checks...)
    if (user && user.role === 'Admin') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.setProperty('display', 'flex', 'important');
      });
    }
    
    if (user && user.role === 'Scanner' && !isScannerPage) {
        const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = '/' + prefix + 'scanner.html';
        return null;
    }
    
    return user;
  }
  return null;
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