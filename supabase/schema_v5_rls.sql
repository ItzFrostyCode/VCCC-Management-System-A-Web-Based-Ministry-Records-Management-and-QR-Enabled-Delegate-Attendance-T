-- ====================================================================
-- VCCC-DAVAO-MS Migration v5: Row Level Security (RLS)
-- Goal: Lockdown the database so the Anon key can only access data
--       when a valid user session is verified via auth.uid()
-- ====================================================================

-- 1. Enable RLS on core tables
ALTER TABLE public.pastors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciples ENABLE ROW LEVEL SECURITY;

-- 2. Create generic read policies (Authenticated users can read all)
CREATE POLICY "Allow authenticated full read access to pastors" ON public.pastors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access to churches" ON public.churches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access to districts" ON public.districts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access to assignments" ON public.assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated full read access to disciples" ON public.disciples FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Create generic write policies (Only Admins and Staff can write)
-- Uses the public.profiles table we created in Migration v4
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'Staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply write policies
CREATE POLICY "Staff/Admins can modify pastors" ON public.pastors FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Staff/Admins can modify churches" ON public.churches FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Staff/Admins can modify districts" ON public.districts FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Staff/Admins can modify assignments" ON public.assignments FOR ALL USING (public.is_staff_or_admin());
CREATE POLICY "Staff/Admins can modify disciples" ON public.disciples FOR ALL USING (public.is_staff_or_admin());

-- ====================================================================
-- INSTRUCTIONS FOR MIGRATION (CRITICAL):
-- ====================================================================
-- Run this script ONLY AFTER you have migrated to Native Supabase Auth (Schema v4).
-- If you run this without logging in through Supabase Auth, your frontend will 
-- instantly return empty arrays for all tables because the Anon key will be blocked.
-- ====================================================================
