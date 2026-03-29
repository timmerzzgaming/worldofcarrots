-- Multiplayer system: lobbies, players, rounds, answers, chat

-- Lobbies
CREATE TABLE IF NOT EXISTS mp_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 6-char join code
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  game_mode TEXT NOT NULL DEFAULT 'multi_mix',
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  max_players INTEGER NOT NULL DEFAULT 8,
  is_public BOOLEAN NOT NULL DEFAULT true,
  current_round INTEGER NOT NULL DEFAULT 0,
  total_rounds INTEGER NOT NULL DEFAULT 0,
  question_seed TEXT, -- shared seed for deterministic question generation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_mp_lobbies_code ON mp_lobbies(code);
CREATE INDEX idx_mp_lobbies_status ON mp_lobbies(status);

-- Lobby players (presence tracking)
CREATE TABLE IF NOT EXISTS mp_lobby_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES mp_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🌍',
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_spectator BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  ping_ms INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ, -- null = still in lobby
  UNIQUE(lobby_id, user_id)
);

CREATE INDEX idx_mp_lobby_players_lobby ON mp_lobby_players(lobby_id);

-- Game answers (per player per round)
CREATE TABLE IF NOT EXISTS mp_game_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES mp_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  answer TEXT, -- the answer given (country name, coordinates, etc.)
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_ms INTEGER NOT NULL DEFAULT 0, -- time taken in milliseconds
  points_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lobby_id, user_id, round_number)
);

CREATE INDEX idx_mp_game_answers_lobby_round ON mp_game_answers(lobby_id, round_number);

-- Chat messages
CREATE TABLE IF NOT EXISTS mp_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES mp_lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🌍',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_chat_lobby ON mp_chat_messages(lobby_id, created_at);

-- RLS policies
ALTER TABLE mp_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_lobby_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_game_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_chat_messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read lobbies (for browser)
CREATE POLICY "Anyone can read lobbies" ON mp_lobbies FOR SELECT USING (true);
CREATE POLICY "Auth users can create lobbies" ON mp_lobbies FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update lobby" ON mp_lobbies FOR UPDATE USING (auth.uid() = host_id);

-- Lobby players
CREATE POLICY "Anyone can read lobby players" ON mp_lobby_players FOR SELECT USING (true);
CREATE POLICY "Auth users can join lobbies" ON mp_lobby_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own record" ON mp_lobby_players FOR UPDATE USING (auth.uid() = user_id);
-- Host can also update (kick) — handled via service role in API

-- Answers
CREATE POLICY "Lobby members can read answers" ON mp_game_answers FOR SELECT USING (true);
CREATE POLICY "Players can submit answers" ON mp_game_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat
CREATE POLICY "Lobby members can read chat" ON mp_chat_messages FOR SELECT USING (true);
CREATE POLICY "Auth users can send chat" ON mp_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to generate a unique 6-char lobby code
CREATE OR REPLACE FUNCTION generate_lobby_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM mp_lobbies WHERE code = result AND status != 'finished') THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
