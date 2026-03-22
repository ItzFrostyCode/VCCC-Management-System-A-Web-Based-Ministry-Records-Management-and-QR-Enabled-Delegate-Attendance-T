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
    if (!authService.isAuthenticated()) {
      // If we are already on the scanner page, allow it (Public Scanner Mode)
      if (window.location.pathname.includes('scanner.html')) {
        return null; 
      }
      // Otherwise, redirect to login
      const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = '/' + prefix + 'login.html';
      return null;
    }
    const user = authService.getCurrentUser();
    
    // Show admin-only elements
    if (user && user.role === 'Admin') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.setProperty('display', 'flex', 'important');
      });
    }
    
    // Role based check: if Scanner tries to access non-scanner page
    if (user && user.role === 'Scanner' && !window.location.pathname.includes('scanner.html')) {
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