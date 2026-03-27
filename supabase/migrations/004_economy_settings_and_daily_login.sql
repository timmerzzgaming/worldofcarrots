-- ============================================================================
-- Economy settings table + daily login columns
-- ============================================================================

-- 1. Economy settings — admin-configurable reward values
CREATE TABLE IF NOT EXISTS public.economy_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.economy_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed client-side for reward calculations)
CREATE POLICY "Anyone can read economy settings"
  ON public.economy_settings FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage economy settings"
  ON public.economy_settings FOR ALL
  USING (public.is_admin());

-- Seed with default values
INSERT INTO public.economy_settings (key, value) VALUES
  ('game_complete_rewards', '{"classic":{"easy":10,"medium":20,"hard":35,"expert":50},"timed":{"easy":8,"medium":15,"hard":25,"expert":40},"marathon":{"easy":30,"medium":50,"hard":80,"expert":120},"survival":{"easy":15,"medium":25,"hard":40,"expert":60},"practice":{"easy":0,"medium":0,"hard":0,"expert":0},"borderless":{"easy":20,"medium":35,"hard":50,"expert":75},"flag":{"easy":12,"medium":22,"hard":38,"expert":55},"distance":{"easy":15,"medium":25,"hard":40,"expert":60},"us-states":{"easy":10,"medium":20,"hard":35,"expert":50}}'::jsonb),
  ('per_correct_multipliers', '{"easy":1,"medium":2,"hard":3,"expert":4}'::jsonb),
  ('star_bonus_per_star', '5'::jsonb),
  ('perfect_score_multiplier', '2.0'::jsonb),
  ('no_hints_bonus', '5'::jsonb),
  ('speed_bonus', '{"threshold":20,"bonus":15}'::jsonb),
  ('hint_cost', '10'::jsonb),
  ('xp_base_per_mode', '{"classic":20,"timed":15,"marathon":50,"survival":25,"practice":5,"borderless":30,"flag":20,"distance":25,"us-states":20}'::jsonb),
  ('xp_difficulty_multipliers', '{"easy":1.0,"medium":1.5,"hard":2.0,"expert":3.0}'::jsonb),
  ('xp_star_bonus', '[0,10,20,40]'::jsonb),
  ('daily_login_rewards', '[5,5,10,10,15,15,25]'::jsonb),
  ('daily_login_streak_bonuses', '{"7":20,"14":50,"30":100}'::jsonb),
  ('daily_login_xp', '10'::jsonb),
  ('daily_login_streak_xp_bonus_7', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Daily login tracking columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_login_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date DATE;
