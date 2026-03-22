class AuthService {
  constructor() {
    this.sessionKey = 'vccc_session_id';
    this.userKey = 'vccc_user_info';
  }

  generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
  }

  getDeviceInfo() {
    return navigator.userAgent;
  }

  async signIn(username, password) {
    try {
      // 1. Check user
      const { data: user, error: userError } = await db
        .from('users')
        .select('*')
        .ilike('username', username)
        .eq('password_hash', password)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') throw new Error('Invalid username or password');
        if (userError.message?.includes('does not exist')) throw new Error('Database table "users" not found. Please run the SQL script in Supabase.');
        throw new Error(userError.message || 'Verification failed');
      }

      if (!user) {
        throw new Error('Invalid username or password');
      }

      // 2. Check active sessions (allow only 1 device)
      const { data: activeSession, error: sessionError } = await db
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('active_flag', true)
        .maybeSingle();

      if (activeSession) {
        throw new Error('This account is already active on another device.');
      }

      // 3. Create Session
      const sessionId = this.generateSessionId();
      const deviceInfo = this.getDeviceInfo();
      
      const { error: insertSessionError } = await db
        .from('user_sessions')
        .insert([{
          user_id: user.id,
          device_info: deviceInfo,
          active_flag: true
        }]);

      if (insertSessionError) {
        if (insertSessionError.message?.includes('does not exist')) throw new Error('Database table "user_sessions" not found. Please run the SQL script.');
        throw new Error('Failed to create session: ' + insertSessionError.message);
      }

      // 4. Log Audit
      await this.logAudit(user.id, 'Login', deviceInfo);

      // 5. Store in local storage
      const userInfo = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        scope: user.scope
      };
      localStorage.setItem(this.sessionKey, sessionId);
      localStorage.setItem(this.userKey, JSON.stringify(userInfo));

      return userInfo;
    } catch (err) {
      console.error('Auth error:', err);
      throw err;
    }
  }

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
    } catch(err) {
       console.error("Signout error", err);
    } finally {
      this.clearSession();
    }
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.userKey);
  }

  getCurrentUser() {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch(e) {
      return null;
    }
  }

  isAuthenticated() {
    return !!localStorage.getItem(this.sessionKey) && !!this.getCurrentUser();
  }

  async logAudit(userId, action, details = null, deviceInfo = null) {
    try {
      if (!deviceInfo) deviceInfo = this.getDeviceInfo();
      await db.from('audit_logs').insert([{
        user_id: userId,
        action: action,
        details: details,
        device_info: deviceInfo
      }]);
    } catch (err) {
      if (err.message?.includes('does not exist')) {
        console.warn('Audit table missing. Did you run the SQL script?');
      } else {
        console.error('Audit log failed', err);
      }
    }
  }
}

const authService = new AuthService();
