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

  // 🧠 LOOP PREVENTION: Detect if we are in a rapid redirect loop
  const redirectCount = parseInt(sessionStorage.getItem('vccc_redirect_count') || '0')
  const lastRedirectTime = parseInt(sessionStorage.getItem('vccc_last_redirect') || '0')
  const now = Date.now()

  if (now - lastRedirectTime < 2000 && redirectCount > 2) {
    console.warn('Redirect loop detected. Stopping auto-redirect.')
    showError('We detected a connection issue. Please click "Continue to Dashboard" to enter.')
    const container = document.querySelector('.login-card') || document.body
    const btn = document.createElement('button')
    btn.className = 'btn btn-primary w-100 mt-16'
    btn.textContent = 'Continue to Dashboard'
    btn.onclick = () => {
      sessionStorage.removeItem('vccc_redirect_count')
      const user = authService.getCurrentUser()
      window.location.href = user?.role === 'Scanner' ? '/scanner.html' : '/index.html'
    }
    btnLogin.parentElement.appendChild(btn)
    btnLogin.style.display = 'none'
    return
  }

  // If already have a valid local session, try to redirect
  if (authService.isAuthenticated()) {
    sessionStorage.setItem('vccc_redirect_count', (redirectCount + 1).toString())
    sessionStorage.setItem('vccc_last_redirect', now.toString())
    
    authService.syncCookies().then(() => {
      const user = authService.getCurrentUser()
      window.location.href = user?.role === 'Scanner' ? '/scanner.html' : '/index.html'
    });
    return
  } else {
    // Reset loop counter if not authenticated
    sessionStorage.removeItem('vccc_redirect_count')
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
  
  const passwordInput = document.getElementById('login-password')
  const toggleBtn = document.getElementById('toggle-password')
  const eyeIcon = toggleBtn.querySelector('.eye')
  const eyeOffIcon = toggleBtn.querySelector('.eye-off')

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password'
    passwordInput.type = isPassword ? 'text' : 'password'
    eyeIcon.style.display = isPassword ? 'block' : 'none'
    eyeOffIcon.style.display = isPassword ? 'none' : 'block'
    toggleBtn.title = isPassword ? 'Hide password' : 'Show password'
  })

  passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin() })
  document.getElementById('login-email').addEventListener('keypress',    e => { if (e.key === 'Enter') handleLogin() })
})