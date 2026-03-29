-- Sticker collection: countries earned from treasure chests
CREATE TABLE IF NOT EXISTS sticker_collection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  country_name TEXT NOT NULL,
  continent TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chest', -- chest, bonus, reward
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, country_name) -- one sticker per country per user
);

CREATE INDEX idx_sticker_collection_user ON sticker_collection(user_id);
CREATE INDEX idx_sticker_collection_continent ON sticker_collection(user_id, continent);

-- RLS
ALTER TABLE sticker_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own stickers"
  ON sticker_collection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert stickers"
  ON sticker_collection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Continent completion bonus tracking (prevent double-claim)
CREATE TABLE IF NOT EXISTS continent_bonus_claimed (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  continent TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonus_coins INTEGER NOT NULL,
  PRIMARY KEY(user_id, continent)
);

ALTER TABLE continent_bonus_claimed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own continent bonuses"
  ON continent_bonus_claimed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can claim continent bonuses"
  ON continent_bonus_claimed FOR INSERT
  WITH CHECK (auth.uid() = user_id);
