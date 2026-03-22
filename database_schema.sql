CREATE TABLE IF NOT EXISTS users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Staff', 'Scanner')),
  scope text DEFAULT 'FULL',
  created_at timestamp with time zone DEFAULT now()
);

-- Insert initial users (using plain passwords)
-- ON CONFLICT (username) DO NOTHING ensures we don't get "already exists" errors for rows.
INSERT INTO users (username, password_hash, full_name, role, scope) VALUES
('Cris', '1234567', 'Cris Enriquez', 'Admin', 'FULL'),
('Josh', '1234567', 'Joshua Arabejo', 'Admin', 'FULL'),
('Angel', '1234567', 'Vida Buenaventura Aljas', 'Staff', 'SEMI FULL, restricted'),
('Eanna', '1234567', 'Eanna Patricia Balagon', 'Staff', 'SEMI FULL, restricted'),
('Scanner', 'Scanner', 'Scanner', 'Scanner', 'Scanner.html only')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  device_info text,
  login_time timestamp with time zone DEFAULT now(),
  active_flag boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text, -- Added for activity logging
  device_info text,
  ip_address text,
  timestamp timestamp with time zone DEFAULT now()
);

-- Row Level Security (RLS) Setup
-- This part is crucial! If you already have the tables, this will fix the "access denied" login issue.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

