sql
-- ==========================================
-- VCCC DAVAO MANAGEMENT SYSTEM DATABASE
-- Requirements: "Wala munang admin" (Full public CRUD)
-- ==========================================
-- 0. Drop old tables cleanly (Since there's no production data yet)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS scan_logs CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS conference_days CASCADE;
DROP TABLE IF EXISTS conferences CASCADE;
DROP TABLE IF EXISTS disciples CASCADE;
DROP TABLE IF EXISTS pastors CASCADE;
DROP TABLE IF EXISTS churches CASCADE;
DROP TABLE IF EXISTS districts CASCADE;

-- 1. Districts
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- Prevent duplicate district names
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 2. Churches
CREATE TABLE IF NOT EXISTS churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, district_id) -- Prevent duplicate churches in the same district
);
-- 3. Pastors (and Wives logic)
CREATE TABLE IF NOT EXISTS pastors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    wife_name TEXT,
    church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
    district_id UUID REFERENCES districts(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(full_name, church_id) -- Prevent duplicate pastors in the same church
);
-- Note: In a real scenario, we might want UNIQUE(full_name, church_id) WHERE (is_deleted IS FALSE)
-- But PostgreSQL UNIQUE constraints don't natively support WHERE without a partial index.
-- This basic UNIQUE is a good starting point.

-- 4. Disciples
CREATE TABLE IF NOT EXISTS disciples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    pastor_id UUID REFERENCES pastors(id) ON DELETE CASCADE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(full_name, pastor_id) -- Prevent duplicate disciples for the same pastor
);
-- 5. Conferences
CREATE TABLE IF NOT EXISTS conferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    theme TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 6. Conference Days
CREATE TABLE IF NOT EXISTS conference_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    day_index INTEGER NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 7. Time Slots
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'MORNING', 'AFTERNOON', 'EVENING'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 8. Meals (Junction between Day and Slot)
CREATE TABLE IF NOT EXISTS meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conference_id, day_id, slot_id) -- Prevent duplicate meal slots
);
-- 9. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    delegate_id UUID NOT NULL, -- FK to either pastors or disciples
    delegate_type TEXT NOT NULL, -- 'PASTOR', 'WIFE', 'DISCIPLE'
    scanned_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conference_id, day_id, slot_id, delegate_id, delegate_type) -- Prevent duplicate scans
);
-- 10. Scan Logs
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
    day_id UUID REFERENCES conference_days(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    delegate_id UUID,
    delegate_type TEXT,
    status TEXT NOT NULL, -- 'SUCCESS', 'ALREADY_SCANNED', 'INVALID_TIME'
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 11. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff', -- 'Admin', 'Staff', 'Scanner'
    scope TEXT, -- For Scanners: 'General', 'Meal', etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. User Sessions (For multi-device logic)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_info TEXT,
    active_flag BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index to help kick-out logic
CREATE UNIQUE INDEX IF NOT EXISTS single_active_session_per_user 
ON user_sessions (user_id) 
WHERE (active_flag = true);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'CREATE_PASTOR', 'DELETE_CONFERENCE', etc.
    details TEXT,
    device_info TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Insert Default Admin
-- Password is 'admin123' (hash same as plaintext for this mock logic)
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Super Admin', 'Admin')
ON CONFLICT (username) DO NOTHING;

-- ==========================================
-- ENABLE "WALA MUNANG ADMIN" (PUBLIC CRUD)
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastors ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciples ENABLE ROW LEVEL SECURITY;
ALTER TABLE conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conference_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies to allow ALL operations for Anon users
CREATE POLICY "Public Access" ON districts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON churches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON pastors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON disciples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON conferences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON conference_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON time_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON scan_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON audit_logs FOR ALL USING (true) WITH CHECK (true);