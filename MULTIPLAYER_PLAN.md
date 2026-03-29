# Multiplayer Feature — Implementation Plan

## Overview
Real-time multiplayer system using Supabase Realtime (Presence + Broadcast channels).
One game mode: **Multi Mix** (mix of flag guessing, country guessing, distance guessing).

## What's Already Done

### Task 1: DB Migration ✅
- File: `supabase/migrations/009_multiplayer.sql`
- Tables: `mp_lobbies`, `mp_lobby_players`, `mp_game_answers`, `mp_chat_messages`
- RLS policies, indexes, `generate_lobby_code()` function
- **NOTE: Migration not yet applied to Supabase — needs to be run in SQL Editor**

### Task 2: Multiplayer Library ✅
- File: `src/lib/multiplayer.ts`
- Lobby CRUD: create, find by code, list open, join, leave, kick
- Player management: ready status, score updates, settings
- Chat: send/load messages (persisted to DB)
- Realtime: `subscribeToLobby()` with Presence + Broadcast
- Ping/pong measurement
- All TypeScript types defined: `Lobby`, `LobbyPlayer`, `ChatMessage`, `GameAnswer`, `MultiQuestion`, `BroadcastEvent`, etc.

### Task 3: Multi Mix Question Generator — IN PROGRESS
- File needed: `src/lib/multiMixQuestions.ts`
- Should generate mixed questions using:
  - Country data from GeoJSON (197 countries, ADMIN property)
  - Flag URLs via `getFlagUrl()` from `src/lib/flagHints.ts`
  - Capital coordinates from `src/lib/capitals.ts` (CAPITALS array)
  - Country difficulty tiers from `src/lib/countryDifficulty.ts`
- Question types: 'flag' | 'country' | 'distance'
- Each question needs: type, prompt, correctAnswer, isoA3 (for flags), capitalLat/capitalLng (for distance), timeLimit
- Use seeded RNG so all clients generate same questions from a shared seed
- Mix ratio: roughly 1/3 each type
- Time limits: flag 15s, country 12s, distance 20s
- Generate based on lobby's `duration_minutes` setting (~2 questions per minute)

## What Still Needs to Be Built

### Task 4: Multiplayer Hub Page
- Route: `src/app/game/multiplayer/page.tsx`
- Features:
  - List open lobbies (from `listOpenLobbies()`) with player count, host name, status
  - "Create Lobby" button → calls `createLobby()` → navigates to lobby page
  - "Join by Code" input → calls `findLobbyByCode()` → `joinLobby()` → navigate
  - "Spectate" option per lobby
  - Registered-only gate (show login prompt for guests)
  - Auto-refresh lobby list every 5 seconds

### Task 5: Lobby Page
- Route: `src/app/game/multiplayer/[id]/page.tsx` (dynamic route)
- Layout: Two panels — left: players + settings, right: chat
- Features:
  - **Player List**: Show all players with avatar, nickname, ready status, ping, host badge
  - **Host Controls**: Kick players (click X), set duration (dropdown: 3/5/10/15 min), toggle public/private, Start Game button (enabled when 2+ players ready)
  - **Ready System**: Non-host players toggle ready with a button
  - **Invite Code**: Display lobby code prominently with copy button
  - **Chat Panel**: Message list + input, auto-scroll, timestamps
  - **Ping Display**: Measure every 5s via Realtime broadcast ping/pong
  - **Realtime**: Subscribe via `subscribeToLobby()`, track presence, handle broadcasts
  - **Leave**: Clean leave on navigation/unmount via `leaveLobby()`
  - **Kick handling**: Listen for `kick` broadcast event, redirect to hub

### Task 6: In-Game Multiplayer View
- Same route as lobby (`/game/multiplayer/[id]`) — phase switches from 'lobby' to 'playing' to 'results'
- **Game Flow** (host-driven):
  1. Host clicks Start → generates questions with seed → broadcasts `game_start`
  2. All clients generate same questions from seed
  3. Host broadcasts `round_start` with round number + timestamp
  4. Players answer (click country on map / click flag / pin location)
  5. Answer submitted via broadcast `player_answer` + saved to DB
  6. After time expires or all answered, host broadcasts `round_end` with results
  7. After all rounds, host broadcasts `game_end` with final scores
- **Question Display**:
  - Flag type: Show flag image, player clicks country on map
  - Country type: Show country name, player clicks on map
  - Distance type: Show "Where is [Capital]?", player pins on map
- **Scoring**:
  - Correct answer: base 1000 points
  - Speed bonus: `1000 * (timeRemaining / timeLimit)` — faster = more points
  - Same correct answer: fastest player gets most points (already handled by speed bonus)
  - Wrong answer: 0 points
  - Distance: score 0-100 based on accuracy, multiplied by 10 for points
- **Live Scoreboard**: Show player rankings, scores, who answered (checkmark)
- **Chat**: Still available during gameplay (collapsible panel)
- **Map**: MapLibre instance shared across question types, dynamically configured per question type

### Task 7: Navigation & i18n
- Add big "MULTIPLAYER" button on home page (above or alongside categories)
  - Not inside a category — it's a top-level entry point
  - Style: prominent, maybe with a 🎮 icon, "LIVE" badge
  - Guest users see it locked with login prompt
- Add to `src/app/page.tsx` in the `entered` main menu section
- Translation keys needed (all 6 languages + types.ts):
  - `mp.multiplayer`, `mp.multiMix`, `mp.createLobby`, `mp.joinByCode`, `mp.joinCode`
  - `mp.openLobbies`, `mp.noLobbies`, `mp.players`, `mp.spectate`, `mp.spectating`
  - `mp.lobby`, `mp.ready`, `mp.notReady`, `mp.start`, `mp.waiting`
  - `mp.kick`, `mp.invite`, `mp.copyCode`, `mp.codeCopied`
  - `mp.duration`, `mp.minutes`, `mp.public`, `mp.private`
  - `mp.chat`, `mp.sendMessage`, `mp.typeMessage`
  - `mp.round`, `mp.score`, `mp.correct`, `mp.wrong`, `mp.timeUp`
  - `mp.gameOver`, `mp.finalScores`, `mp.winner`, `mp.playAgain`
  - `mp.loginRequired`, `mp.lobbyFull`, `mp.hostLeft`, `mp.kicked`
  - `mp.ping`

## Architecture Notes

### Supabase Realtime Channel per Lobby
- Channel name: `lobby:{lobbyId}`
- Presence: tracks online players (auto-removes on disconnect)
- Broadcast events: game state, chat, ping/pong, kicks
- DB: persists lobbies, scores, chat, answers (for history/analytics)

### Host-Authoritative Model
- Host controls game flow (start, advance rounds, end)
- Clients generate questions locally from shared seed (deterministic)
- Answers validated client-side (simplicity for now, can add server validation later)
- If host disconnects, lobby ends (can add host migration later)

### Map Rendering
- Single MapLibre instance on the game page
- Reconfigured per question type:
  - Country/Flag: click-to-identify (same as click-country mode)
  - Distance: click-to-pin (same as distance mode)
- Load GeoJSON source once, swap interaction handlers per round

### Key Files Reference
- `src/lib/supabase.ts` — Supabase client (already supports Realtime)
- `src/lib/gameEngine.ts` — existing question generation
- `src/lib/flagHints.ts` — `getFlagUrl(name, isoA3)` for flag images
- `src/lib/capitals.ts` — `CAPITALS` array with lat/lng
- `src/lib/countryDifficulty.ts` — difficulty tiers for balanced question selection
- `src/lib/distanceScoring.ts` — `calculateDistanceScore()` for distance questions
- `src/types/game.ts` — `Country`, `Question`, `GameMode` types
- `public/data/countries.geojson` — country polygons (promoteId: 'ADMIN')

### Package Dependencies
- `@supabase/supabase-js` ^2.100.0 — already installed, includes Realtime
- No additional packages needed

## Estimated File Count
- `src/lib/multiMixQuestions.ts` — question generator with seeded RNG
- `src/app/game/multiplayer/page.tsx` — hub/browser page
- `src/app/game/multiplayer/[id]/page.tsx` — lobby + game page
- `src/components/multiplayer/ChatPanel.tsx` — reusable chat component
- `src/components/multiplayer/PlayerList.tsx` — player list with controls
- `src/components/multiplayer/GameScoreboard.tsx` — live scoreboard
- `src/components/multiplayer/MultiQuestion.tsx` — question display component
- i18n updates: `types.ts`, `translations.ts`, + 5 language files
- `src/app/page.tsx` — add multiplayer button
