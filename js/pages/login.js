document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btn-login');
  const errorEl = document.getElementById('login-error');
  
  // Check for session expiration message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    errorEl.textContent = 'Session expired. You were logged in on another device.';
    errorEl.style.display = 'block';
    errorEl.classList.add('alert-warn'); // Assuming a warning style
  }

  // If already logged in, redirect
  if (authService.isAuthenticated()) {
     const user = authService.getCurrentUser();
     if (user.role === 'Scanner') {
       window.location.href = '/scanner.html';
     } else {
       window.location.href = '/index.html';
     }
     return;
  }

  btnLogin.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password.';
      errorEl.style.display = 'block';
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Signing in...';
    errorEl.style.display = 'none';

    try {
      const user = await authService.signIn(username, password);
      // Redirect based on role
      if (user.role === 'Scanner') {
        window.location.href = '/scanner.html';
      } else {
        window.location.href = '/index.html';
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Verification failed. Please try again.';
      errorEl.style.display = 'block';
      btnLogin.disabled = false;
      btnLogin.textContent = 'Sign In';
    }
  });

  // Enter key support
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnLogin.click();
    }
  });
});
