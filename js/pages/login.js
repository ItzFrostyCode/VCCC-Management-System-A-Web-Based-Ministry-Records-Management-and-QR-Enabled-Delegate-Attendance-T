// login.js — Module-based. Auth handled by auth.service.js → db.js (no circular deps).
import { authService } from '../services/auth.service.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btn-login')
  const errorEl  = document.getElementById('login-error')

  function showError(msg) {
    errorEl.textContent   = msg
    errorEl.style.display = 'block'
  }

  // Check for expired session message
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('expired') === 'true') {
    showError('Session expired. Please sign in again.')
  }

  // If already have a valid local session, redirect
  if (authService.isAuthenticated()) {
    const user = authService.getCurrentUser()
    window.location.href = user?.role === 'Scanner' ? '/scanner.html' : '/index.html'
    return
  }

  // ── Sign In handler ─────────────────────────────────────────────────────────
  async function handleLogin() {
    const email    = document.getElementById('login-email').value.trim()
    const password = document.getElementById('login-password').value.trim()

    if (!email || !password) {
      showError('Please enter both email and password.')
      return
    }

    btnLogin.disabled     = true
    btnLogin.textContent  = 'Signing in...'
    errorEl.style.display = 'none'

    try {
      const user = await authService.signIn(email, password)
      window.location.href = user.role === 'Scanner' ? '/scanner.html' : '/index.html'
    } catch (err) {
      showError(err.message || 'Sign in failed. Please try again.')
      btnLogin.disabled    = false
      btnLogin.textContent = 'Sign In'
    }
  }

  // Bind button and Enter key
  btnLogin.addEventListener('click', handleLogin)
  document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin() })
  document.getElementById('login-email').addEventListener('keypress',    e => { if (e.key === 'Enter') handleLogin() })
})