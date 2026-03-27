-- ============================================================================
-- Fix RLS policies: admin policies that subquery profiles table cause
-- infinite recursion. Replace with a SECURITY DEFINER helper function.
-- ============================================================================

-- Helper function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all admin policies
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all scores" ON public.high_scores;
DROP POLICY IF EXISTS "Admin can read all transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admin can insert transactions" ON public.credit_transactions;

-- Recreate using the helper function
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Admin can read all scores"
  ON public.high_scores FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can read all transactions"
  ON public.credit_transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (public.is_admin());
