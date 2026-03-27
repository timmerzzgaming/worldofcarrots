-- ============================================================================
-- Daily challenges
-- ============================================================================

-- 1. Daily challenge definitions (one per day)
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  date DATE PRIMARY KEY,
  mode TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  seed TEXT NOT NULL,
  question_data JSONB,
  coin_reward INTEGER NOT NULL DEFAULT 30,
  diamond_reward INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily challenges"
  ON public.daily_challenges FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage daily challenges"
  ON public.daily_challenges FOR ALL
  USING (public.is_admin());

-- 2. Player results for daily challenges
CREATE TABLE IF NOT EXISTS public.daily_challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL REFERENCES public.daily_challenges(date),
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  elapsed REAL NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_results_date
  ON public.daily_challenge_results(challenge_date, score DESC);

ALTER TABLE public.daily_challenge_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily challenge results"
  ON public.daily_challenge_results FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own daily results"
  ON public.daily_challenge_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage daily results"
  ON public.daily_challenge_results FOR ALL
  USING (public.is_admin());
