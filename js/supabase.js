import { db } from './db.js';
export { db };

// ── Auth guard & helpers ──────────────────────────────────────────────────────
// This was previously client-side checking raw UUIDs against 'user_sessions'.
// We now rely on Supabase Native Auth mapped through our Auth Service and Vercel Middleware.
import { authService } from './services/auth.service.js';

export async function requireAuth() {
  const path = window.location.pathname;
  const isScannerPage = path === '/scanner' || path.includes('scanner.html');

  if (!authService.isAuthenticated()) {
    if (isScannerPage) return null;
    window.location.href = '/login.html';
    return null;
  }

  const { data: { session }, error } = await db.auth.getSession();
  
  if (error || !session) {
    authService.clearSession();
    window.location.href = '/login.html?expired=true';
    return null;
  }

  // ── Step 2: Apply role-based UI visibility ──
  const user = authService.getCurrentUser();
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

// Toggle test mode — DEVELOPMENT ONLY, gated to localhost
export function toggleTestMode() {
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