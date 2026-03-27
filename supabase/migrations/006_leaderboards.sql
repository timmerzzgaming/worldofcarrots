-- ============================================================================
-- Weekly leaderboards + streak freezes
-- ============================================================================

-- 1. Weekly leaderboard entries
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  mode TEXT NOT NULL,
  total_coins_earned INTEGER NOT NULL DEFAULT 0,
  total_stars_earned INTEGER NOT NULL DEFAULT 0,
  total_xp_earned INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start, mode)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_mode
  ON public.leaderboard_entries(week_start, mode, total_xp_earned DESC);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Everyone can read leaderboards
CREATE POLICY "Anyone can read leaderboards"
  ON public.leaderboard_entries FOR SELECT
  USING (true);

-- Users can insert/update own entries
CREATE POLICY "Users can upsert own leaderboard entries"
  ON public.leaderboard_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entries"
  ON public.leaderboard_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage leaderboards"
  ON public.leaderboard_entries FOR ALL
  USING (public.is_admin());

-- 2. Streak freezes on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_freezes INTEGER NOT NULL DEFAULT 0;
