class AuthService {
  constructor() {
    this.sessionKey = 'vccc_session_id';
    this.userKey    = 'vccc_user_info';
    // DB-generated UUIDs only — rejects arbitrary injected strings
    this._uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  }

  getDeviceInfo() {
    return navigator.userAgent;
  }

  // ── Sign In ────────────────────────────────────────────────────────────────
  async signIn(username, password) {
    try {
      // 1. Verify credentials via RPC (checks public.users using pgcrypto crypt())
      //    No email required — pure username + password against public.users.
      const { data: rows, error: rpcError } = await db.rpc('verify_login', {
        p_username: username,
        p_password: password
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Login failed. Please try again.');
      }

      if (!rows || rows.length === 0) {
        throw new Error('Invalid username or password.');
      }

      const dbUser = rows[0];

      if (!dbUser.is_active) {
        throw new Error('Your account has been deactivated. Contact your administrator.');
      }

      // 2. Invalidate all existing active sessions for this user (auto-kick old devices)
      const { error: clearError } = await db
        .from('user_sessions')
        .update({ active_flag: false })
        .eq('user_id', dbUser.id)
        .eq('active_flag', true);

      if (clearError) {
        console.warn('Failed to clear old sessions:', clearError);
      }

      // 3. Create a new session row — DB generates a UUID we cannot spoof
      const deviceInfo = this.getDeviceInfo();

      const { data: newSession, error: sessErr } = await db
        .from('user_sessions')
        .insert([{
          user_id:     dbUser.id,
          device_info: deviceInfo,
          active_flag: true
        }])
        .select('id')
        .single();

      if (sessErr) {
        throw new Error('Failed to create session: ' + sessErr.message);
      }

      // 4. Log the login action
      await this.logAudit(dbUser.id, 'Login', deviceInfo);

      // 5. Cache in localStorage (client-side cache only — NOT the auth source of truth)
      const userInfo = {
        id:        dbUser.id,
        username:  dbUser.username,
        full_name: dbUser.full_name,
        role:      dbUser.role,
        scope:     dbUser.scope
      };

      localStorage.setItem(this.sessionKey, newSession.id);
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
    if (!user) {
      this.clearSession();
      return;
    }

    try {
      await db
        .from('user_sessions')
        .update({ active_flag: false })
        .eq('user_id', user.id);

      await this.logAudit(user.id, 'Logout', this.getDeviceInfo());
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
   * The authoritative server-side guard is requireAuth() in supabase.js.
   *
   * Returns true only if:
   *   - sessionKey in localStorage is a valid UUID format (cannot be an arbitrary string)
   *   - userKey in localStorage parses to an object with a non-empty id
   */
  isAuthenticated() {
    const sessionId = localStorage.getItem(this.sessionKey);
    const user      = this.getCurrentUser();

    if (!sessionId || !user || !user.id) return false;
    if (!this._uuidPattern.test(sessionId))  return false;

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
      if (err.message?.includes('does not exist')) {
        console.warn('Audit table missing. Did you run the SQL script?');
      } else {
        console.error('Audit log failed:', err);
      }
    }
  }
}

const authService = new AuthService();