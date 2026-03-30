// ── Supabase config ────────────────────────
const SUPABASE_URL  = 'https://wfeeoojneyuoeutzndie.supabase.co'
const SUPABASE_ANON = 'sb_publishable_zOwCaEW4IE_isQ321B9UyQ_4SuHdom-'

// ── Init client ─────────────────────────────
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON)

console.log('VCCC is now connected to LIVE Supabase Database')

// ── Auth guard & helpers ──────────────────────────────────────────────────────
// Tracks consecutive session-check network failures across calls
let _sessionCheckFailures = 0;
const SESSION_FAILURE_LIMIT = 3;

async function requireAuth() {
  if (typeof authService !== 'undefined') {
    const path = window.location.pathname;
    const isScannerPage = path === '/scanner' || path.includes('scanner.html');

    if (!authService.isAuthenticated()) {
      if (isScannerPage) return null;
      window.location.href = '/login.html';
      return null;
    }

    const user = authService.getCurrentUser();
    const sessionId = localStorage.getItem('vccc_session_id');

    // ── Step 1: Verify DB session is still active (kicks out old/stolen sessions) ──
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
          window.location.href = '/login.html?expired=true';
          return null;
        }

        // Reset failure counter on success
        _sessionCheckFailures = 0;
      } catch (e) {
        // Network error — do NOT silently pass. Track failures.
        _sessionCheckFailures++;
        console.error(`Session validation failed (attempt ${_sessionCheckFailures}/${SESSION_FAILURE_LIMIT}):`, e);

        if (_sessionCheckFailures >= SESSION_FAILURE_LIMIT) {
          // Repeated failures suggest a connectivity or tamper issue — force re-login
          console.warn('Repeated session check failures. Forcing re-login for safety.');
          authService.clearSession();
          window.location.href = '/login.html?expired=true';
          return null;
        }
        // Allow one or two transient failures through (e.g. brief offline)
      }
    }

    // ── Step 2: Apply role-based UI visibility ──
    if (user && user.role === 'Admin') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.setProperty('display', 'flex', 'important');
      });
    }

    if (user && user.role === 'Scanner') {
        document.body.classList.add('role-scanner');
        if (!isScannerPage) {
            window.location.href = '/scanner.html';
            return null;
        }
    }

    return user;
  }
  return null;
}
// Toggle test mode — DEVELOPMENT ONLY, gated to localhost
function toggleTestMode() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('toggleTestMode is disabled in production.');
    return;
  }
  const current = localStorage.getItem('vccc_test_mode') === 'true'
  const target = !current
  localStorage.setItem('vccc_test_mode', String(target))
  alert(`Test Mode (LocalStorage) is now ${target ? 'ON' : 'OFF'}.\n\nOffline testing is now active.`)
  window.location.reload()
}

// Exposed for dev console — localhost only
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.toggleVCCCTestMode = toggleTestMode;
}