-- ============================================================================
-- Diamonds (premium currency), chests, and player achievements
-- ============================================================================

-- 1. Add diamonds to profiles + games_completed counter
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS games_completed INTEGER NOT NULL DEFAULT 0;

-- 2. Add currency column to credit_transactions (coins or diamonds)
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'coins';

-- 3. Atomic diamond increment
CREATE OR REPLACE FUNCTION public.increment_diamonds(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET diamonds = diamonds + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic games_completed increment
CREATE OR REPLACE FUNCTION public.increment_games_completed(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles SET games_completed = games_completed + 1 WHERE id = p_user_id RETURNING games_completed INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Player achievements (one-time milestones)
CREATE TABLE IF NOT EXISTS public.player_achievements (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_key)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON public.player_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.player_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all achievements"
  ON public.player_achievements FOR SELECT
  USING (public.is_admin());

-- 6. Treasure chests
CREATE TABLE IF NOT EXISTS public.chests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  contents JSONB
);

CREATE INDEX IF NOT EXISTS idx_chests_user_id ON public.chests (user_id);

ALTER TABLE public.chests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chests"
  ON public.chests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own chests"
  ON public.chests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chests"
  ON public.chests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chests"
  ON public.chests FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all chests"
  ON public.chests FOR ALL
  USING (public.is_admin());
