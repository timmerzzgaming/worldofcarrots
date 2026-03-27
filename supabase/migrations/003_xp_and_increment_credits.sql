-- ============================================================================
-- Add XP/level columns and atomic increment functions
-- ============================================================================

-- 1. Add XP and level to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

-- 2. Atomic credit increment (avoids read+write race condition)
CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic XP increment — returns new total XP for level-up detection
CREATE OR REPLACE FUNCTION public.increment_xp(p_user_id UUID, p_amount INTEGER, p_new_level INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_xp INTEGER;
BEGIN
  UPDATE public.profiles
  SET xp = xp + p_amount, level = p_new_level
  WHERE id = p_user_id
  RETURNING xp INTO new_xp;
  RETURN new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
