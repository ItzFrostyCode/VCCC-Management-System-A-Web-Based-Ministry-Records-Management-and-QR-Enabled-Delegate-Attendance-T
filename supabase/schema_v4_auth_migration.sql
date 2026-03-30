-- ====================================================================
-- VCCC-DAVAO-MS Migration v4: Secure Authentication
-- Goal: Migrate Custom Auth to Native Supabase Auth (GoTrue)
-- Warning: After running this, users must log in with their EMAIL
--          instead of a single 'username'.
-- ====================================================================

-- 1. Create a secure "Profiles" table to store public user data since auth.users is hidden.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Staff', 'Scanner')),
  scope text DEFAULT 'FULL',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2. Turn ON Row Level Security for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone logged in can read public profiles (needed for dashboards)
CREATE POLICY "Allow authenticated full read access to profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Policy: Only Admins can modify other profiles
CREATE POLICY "Admins can modify profiles"
ON public.profiles FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'
));

-- 5. Trigger to automatically create a profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, scope)
  VALUES (
    NEW.id,
    -- Defaulting username to the email prefix
    split_part(NEW.email, '@', 1),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Staff'),
    'FULL'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- INSTRUCTIONS FOR MIGRATION (CRITICAL):
-- ====================================================================
-- Because your old `users` table stored passwords using plain pgcrypto `crypt()`,
-- you cannot mass-import passwords into Supabase `auth.users` easily without
-- generating Bcrypt hashes compatible with GoTrue.
-- 
-- ACTION REQUIRED: 
-- 1. Go to Supabase Dashboard > Authentication > Users.
-- 2. Manually invite or create the accounts for your Admin, Staff, and Scanners using their Email.
-- 3. When they are created, the trigger above will automatically create their `public.profiles`.
-- 4. You can then drop your old `public.users` and `public.user_sessions` tables safely.
-- ====================================================================
