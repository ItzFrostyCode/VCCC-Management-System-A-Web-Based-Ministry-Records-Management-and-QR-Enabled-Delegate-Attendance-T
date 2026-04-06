import { authService } from '../../services/auth.service.js';
import { ui } from '../../utils/ui.js';

class LoginController {
    constructor() {
        this.btnLogin = null;
        this.errorEl = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.toggleBtn = null;
    }

    async init() {
        try {
            this.btnLogin = document.getElementById('btn-login');
            this.errorEl = document.getElementById('login-error');
            this.emailInput = document.getElementById('login-email');
            this.passwordInput = document.getElementById('login-password');
            this.toggleBtn = document.getElementById('toggle-password');

            if (!this.btnLogin) return;

            this.checkSessionStatus();
            this.detectRedirectLoop();
            this.bindEvents();
        } catch (err) {
            console.error('Login controller init failed:', err);
        }
    }

    showError(msg) {
        if (this.errorEl) {
            this.errorEl.textContent = msg;
            this.errorEl.style.display = 'block';
        } else {
            ui.toast(msg, 'error');
        }
    }

    checkSessionStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('expired') === 'true') {
            this.showError('Session expired. Please sign in again.');
        }

        if (authService.isAuthenticated()) {
            this.performRedirect();
        }
    }

    detectRedirectLoop() {
        const redirectCount = parseInt(sessionStorage.getItem('vccc_redirect_count') || '0');
        const lastRedirectTime = parseInt(sessionStorage.getItem('vccc_last_redirect') || '0');
        const now = Date.now();

        if (now - lastRedirectTime < 2000 && redirectCount > 2) {
            console.warn('Redirect loop detected. Stopping auto-redirect.');
            this.showError('Connection issue detected. Please manually enter.');
            this.renderBypassButton();
        }
    }

    renderBypassButton() {
        if (!this.btnLogin) return;
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary w-100 mt-16';
        btn.textContent = 'Continue to Dashboard';
        btn.onclick = () => {
            sessionStorage.removeItem('vccc_redirect_count');
            this.performRedirect();
        };
        this.btnLogin.parentElement.appendChild(btn);
        this.btnLogin.style.display = 'none';
    }

    async performRedirect() {
        const now = Date.now();
        const redirectCount = parseInt(sessionStorage.getItem('vccc_redirect_count') || '0');
        sessionStorage.setItem('vccc_redirect_count', (redirectCount + 1).toString());
        sessionStorage.setItem('vccc_last_redirect', now.toString());

        await authService.syncCookies();
        const user = authService.getCurrentUser();
        window.location.href = user?.role === 'Scanner' ? 'scanner.html' : 'index.html';
    }

    bindEvents() {
        this.btnLogin.onclick = () => this.handleLogin();
        
        if (this.toggleBtn && this.passwordInput) {
            this.toggleBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const isPassword = this.passwordInput.type === 'password';
                this.passwordInput.type = isPassword ? 'text' : 'password';
                
                const eye = this.toggleBtn.querySelector('.eye');
                const eyeOff = this.toggleBtn.querySelector('.eye-off');
                if (eye && eyeOff) {
                    eye.style.setProperty('display', isPassword ? 'block' : 'none', 'important');
                    eyeOff.style.setProperty('display', isPassword ? 'none' : 'block', 'important');
                }
                this.toggleBtn.title = isPassword ? 'Hide password' : 'Show password';
            };
        }

        const handleEnter = e => { if (e.key === 'Enter') this.handleLogin(); };
        this.emailInput?.addEventListener('keypress', handleEnter);
        this.passwordInput?.addEventListener('keypress', handleEnter);
    }

    async handleLogin() {
        const email = this.emailInput?.value.trim();
        const password = this.passwordInput?.value.trim();

        if (!email || !password) {
            this.showError('Please enter both email and password.');
            return;
        }

        try {
            this.setLoading(true);
            const user = await authService.signIn(email, password);
            sessionStorage.removeItem('vccc_redirect_count');
            window.location.href = user.role === 'Scanner' ? 'scanner.html' : 'index.html';
        } catch (err) {
            this.showError(err.message || 'Sign in failed. Please try again.');
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (!this.btnLogin) return;
        this.btnLogin.disabled = isLoading;
        this.btnLogin.textContent = isLoading ? 'Signing in...' : 'Sign In';
        if (this.errorEl && isLoading) this.errorEl.style.display = 'none';
    }
}

const controller = new LoginController();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
    controller.init();
}
export default controller;
