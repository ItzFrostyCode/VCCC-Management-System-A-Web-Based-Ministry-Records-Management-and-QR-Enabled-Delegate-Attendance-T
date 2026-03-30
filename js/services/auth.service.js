import { db } from '../supabase.js';

class AuthService {
  constructor() {
    this.sessionKey = 'vccc_session_id';
    this.userKey    = 'vccc_user_info';
  }

  // ── Cookie Helpers for Vercel Edge Middleware ──
  setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; secure; samesite=strict";
  }

  eraseCookie(name) {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  getDeviceInfo() {
    return navigator.userAgent;
  }

  // ── Sign In ────────────────────────────────────────────────────────────────
  async signIn(email, password) {
    try {
      // 1. Use Native Supabase Auth (GoTrue)
      const { data: authData, error: authError } = await db.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password.');
      }

      // 2. Fetch the user's role/scope from the new `profiles` table
      const { data: profile, error: profileErr } = await db
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileErr || !profile) {
        // Fallback for Admins testing before trigger fires
        throw new Error('Profile not found. Please contact an administrator.');
      }

      if (!profile.is_active) {
        await this.signOut();
        throw new Error('Your account has been deactivated. Contact your administrator.');
      }

      // 3. Set the cookie so Vercel Edge Middleware can read it
      this.setCookie('sb-access-token', authData.session.access_token, 7);
      this.setCookie('sb-refresh-token', authData.session.refresh_token, 7);

      // 4. Log the login action
      await this.logAudit(profile.id, 'Login', this.getDeviceInfo());

      // 5. Cache UI info in localStorage (Not authoritative for security)
      const userInfo = {
        id:        profile.id,
        username:  profile.username,
        full_name: profile.full_name,
        role:      profile.role,
        scope:     profile.scope
      };

      // Keep for backwards compatibility with UI
      localStorage.setItem(this.sessionKey, authData.session.access_token);
      localStorage.setItem(this.userKey, JSON.stringify(userInfo));

      return userInfo;
    } catch (err) {
      console.error('Auth error:', err);
      throw err;
    }
  }

  // ── Sign Out ───────────────────────────────────────────────────────────────
  async signOut() {
    const user = this.getCurrentUser();
    
    try {
      if (user) {
        await this.logAudit(user.id, 'Logout', null, this.getDeviceInfo());
      }
      await db.auth.signOut();
    } catch (err) {
      console.error('Signout error:', err);
    } finally {
      this.clearSession();
    }
  }

  // ── Session Helpers ────────────────────────────────────────────────────────
  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.userKey);
    this.eraseCookie('sb-access-token');
    this.eraseCookie('sb-refresh-token');
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * FAST local-cache check — for quick UI gating only.
   */
  isAuthenticated() {
    const sessionId = localStorage.getItem(this.sessionKey);
    const user      = this.getCurrentUser();

    if (!sessionId || !user || !user.id) return false;
    return true;
  }

  // ── Audit ──────────────────────────────────────────────────────────────────
  async logAudit(userId, action, details = null, deviceInfo = null) {
    try {
      if (!deviceInfo) deviceInfo = this.getDeviceInfo();
      await db.from('audit_logs').insert([{
        user_id:     userId,
        action:      action,
        details:     details,
        device_info: deviceInfo
      }]);
    } catch (err) {
      console.warn('Audit log failed or table missing:', err.message);
    }
  }
}

export const authService = new AuthService();