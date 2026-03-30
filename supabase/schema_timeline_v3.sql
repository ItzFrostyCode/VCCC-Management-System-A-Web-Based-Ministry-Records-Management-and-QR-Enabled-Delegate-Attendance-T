-- VCCC-DAVAO-MS Schema Migration v3
-- Implements the Ministry Timeline Engine architecture

-- 1. Create rank_history table
CREATE TABLE IF NOT EXISTS rank_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pastor_id UUID NOT NULL REFERENCES public.pastors(id) ON DELETE CASCADE,
    rank_code TEXT NOT NULL,
    effective_date DATE,
    precision_flag TEXT DEFAULT 'exact' CHECK (precision_flag IN ('exact', 'month', 'year', 'unknown')),
    notes TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create training_log table
CREATE TABLE IF NOT EXISTS training_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pastor_id UUID NOT NULL REFERENCES public.pastors(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    status_code TEXT NOT NULL CHECK (status_code IN ('Completed', 'Failed', 'In-Progress')),
    completion_date DATE,
    precision_flag TEXT DEFAULT 'exact' CHECK (precision_flag IN ('exact', 'month', 'year', 'unknown')),
    blocker_flag BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create church_locations table (Historical addresses)
CREATE TABLE IF NOT EXISTS church_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    precision_flag TEXT DEFAULT 'exact' CHECK (precision_flag IN ('exact', 'month', 'year', 'unknown')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alter assignments table to support timeline rigor
ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS precision_flag TEXT DEFAULT 'exact' CHECK (precision_flag IN ('exact', 'month', 'year', 'unknown')),
  ADD COLUMN IF NOT EXISTS handover_id UUID REFERENCES assignments(id),
  ADD COLUMN IF NOT EXISTS role_code TEXT;

-- Drop old constraint that blocks new event_type values
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS chk_assignment_type;
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;

-- Rename assignment_type to event_type
-- Note: if the column was already renamed, this might throw an error. In pure SQL migrations, you'd check first.
ALTER TABLE assignments RENAME COLUMN assignment_type TO event_type;

-- Safe Backfill: Split old values into role_code and event_type
UPDATE assignments
SET 
  role_code = CASE
    WHEN event_type IN ('Lead Pastor', 'Assistant Pastor', 'District Presbyter', 'Interim Setup', 'regular') THEN event_type
    ELSE role_code 
  END,
  event_type = CASE
    WHEN event_type IN ('Pioneering', 'Takeover', 'Transfer', 'Pullout') THEN event_type
    WHEN event_type IN ('Lead Pastor', 'Assistant Pastor', 'District Presbyter', 'Interim Setup', 'regular') THEN 'Legacy Assignment'
    ELSE event_type
  END
WHERE role_code IS NULL;

-- Enforce the rule: "one pastor cannot have two active Primary records at the same time"
DROP INDEX IF EXISTS idx_unique_active_primary_assignment;
CREATE UNIQUE INDEX idx_unique_active_primary_assignment 
ON assignments(pastor_id) 
WHERE end_date IS NULL AND is_primary = true;

-- 5. RLS Policies for new tables
ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read access to rank_history" ON rank_history;
CREATE POLICY "Allow authenticated read access to rank_history" ON rank_history FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated full access to rank_history" ON rank_history;
CREATE POLICY "Allow authenticated full access to rank_history" ON rank_history FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated read access to training_log" ON training_log;
CREATE POLICY "Allow authenticated read access to training_log" ON training_log FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated full access to training_log" ON training_log;
CREATE POLICY "Allow authenticated full access to training_log" ON training_log FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated read access to church_locations" ON church_locations;
CREATE POLICY "Allow authenticated read access to church_locations" ON church_locations FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated full access to church_locations" ON church_locations;
CREATE POLICY "Allow authenticated full access to church_locations" ON church_locations FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. RPC Function for Atomic Transfer
CREATE OR REPLACE FUNCTION transfer_pastor(
    p_pastor_id UUID,
    p_new_church_id UUID,
    p_transfer_date DATE,
    p_role_code TEXT,
    p_event_type TEXT,
    p_notes TEXT,
    p_is_primary BOOLEAN,
    p_precision_flag TEXT
) RETURNS UUID 
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_assignment_id UUID;
    v_new_assignment_id UUID;
    v_active_status TEXT := 'active';
BEGIN
    -- If assigning as primary, close any existing active primary assignment first
    IF p_is_primary THEN
        SELECT id INTO v_old_assignment_id 
        FROM assignments 
        WHERE pastor_id = p_pastor_id 
          AND is_primary = true 
          AND end_date IS NULL;

        IF v_old_assignment_id IS NOT NULL THEN
            UPDATE assignments 
            SET end_date = p_transfer_date,
                updated_at = NOW(),
                status_code = 'transferred'
            WHERE id = v_old_assignment_id;
        END IF;
    END IF;

    -- Insert the new assignment event
    INSERT INTO assignments (
        pastor_id, 
        church_id, 
        role_code,
        event_type, 
        status_code, 
        start_date, 
        is_primary, 
        precision_flag, 
        notes,
        handover_id
    ) VALUES (
        p_pastor_id, 
        p_new_church_id, 
        p_role_code,
        COALESCE(p_event_type, 'Transfer'), 
        v_active_status, 
        p_transfer_date, 
        p_is_primary, 
        p_precision_flag, 
        p_notes,
        v_old_assignment_id -- link handover explicitly to the outgoing assignment
    ) RETURNING id INTO v_new_assignment_id;

    RETURN v_new_assignment_id;
END;
$$;

-- 7. RPC Function for Pullout
CREATE OR REPLACE FUNCTION pullout_pastor(
    p_pastor_id UUID,
    p_pullout_date DATE,
    p_notes TEXT
) RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    -- Close the current active primary assignment
    SELECT id INTO v_assignment_id 
    FROM assignments 
    WHERE pastor_id = p_pastor_id 
      AND is_primary = true 
      AND end_date IS NULL;

    IF v_assignment_id IS NOT NULL THEN
        UPDATE assignments 
        SET end_date = p_pullout_date,
            updated_at = NOW(),
            status_code = 'pullout',
            notes = COALESCE(notes || CHR(10) || p_notes, p_notes)
        WHERE id = v_assignment_id;
        RETURN true;
    END IF;

    RETURN false;
END;
$$;
