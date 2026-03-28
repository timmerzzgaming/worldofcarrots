# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

World Of Carrots (worldofcarrots.com) — a geography games platform with vector maps (MapLibre GL JS), 8 game modes, difficulty tiers, multi-language support, sound effects, background music, Supabase backend with economy system (coins, XP, diamonds, chests, leaderboards, daily challenges).

## Stack

- **Framework**: Next.js 14 (App Router, `src/` directory)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS — no CSS modules, no inline styles
- **Map engine**: MapLibre GL JS (dynamically imported in game pages)
- **Map style**: Inline light style (white countries, blue ocean) — no external tile provider needed
- **Country data**: Natural Earth 50m GeoJSON (197 countries), served from `public/data/countries.geojson`
- **Flags**: SVGs from `flag-icons` package, copied to `public/flags/{4x3,1x1}/` via build script
- **State**: Zustand (single `gameStore` for click-country/flag modes); distance mode uses local state
- **Animation**: Framer Motion
- **Sound**: Web Audio API (synthesized effects) + HTML5 Audio (background music)
- **i18n**: Custom context-based system (`lib/i18n/`) — 6 languages (en, fr, de, nl, es, zh)
- **Linting**: ESLint (next/core-web-vitals)

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server (http://localhost:3000)
npm run build                  # Production build
npm run lint                   # Check lint errors
start.bat                     # Dev server on 0.0.0.0:3000 (LAN accessible)
node scripts/copy-flags.js     # Copy flag SVGs from flag-icons to public/flags/
node scripts/build-countries.js # Rebuild countries.geojson from raw Natural Earth data
```

## Architecture

### Game pages (3 separate map contexts)

Each game type has its own page with its own MapLibre instance:

1. **Home page** (`page.tsx`) — title screen → main menu. Uses `MapCanvas` via `MapBackground` for decoration only.
2. **Guess the Country** (`game/click-country/page.tsx`) — click a country on the map given its name. Supports 6 sub-modes (classic, timed, marathon, survival, practice, borderless). Uses Zustand `gameStore`.
3. **Guess the Flag** (`game/flag/page.tsx`) — see a flag, click the country. Has hint system (continent reveal, lookalike elimination), skip/re-queue mechanic. Uses Zustand `gameStore`.
4. **Distance Mode** (`game/distance/page.tsx`) — pin a capital city on the map, scored 0-100 based on normalized distance. Uses local state (not gameStore). Features animated dotted lines, review phase, hover popups.

### Map layers

All game pages use these MapLibre layers on the `countries` source:
- `countries-fill` — polygon fill (white default, green solved, red/blue feedback)
- `countries-line` — border lines
- `small-countries-circle` / `small-countries-ring` — click targets for microstates (data-driven radius, e.g. Kiribati gets 40px)

Additional layers per mode:
- **Borderless**: line layer colored to match landmass (seamless appearance, full opacity)
- **Flag mode**: `eliminated` feature state for hint-driven greying out
- **Distance mode**: indexed per-answer overlays (`line-N`, `guess-N`, `target-N`) that persist until game end

### Game modes

Defined in `lib/gameEngine.ts` as `GAME_MODES` record:
- **classic** — 10 questions, 15s each
- **timed** — 60s global timer, unlimited questions
- **marathon** — all 197 countries, no timer
- **survival** — 3 lives, lose 1 per mistake, earn 1 back every 25 correct
- **practice** — no timer, no lives, optional region filter
- **borderless** — no visible borders, 3 lives, fully opaque landmass
- **flag** — see flag, click country. 3 hints (continent/eliminate/narrow), skip with re-queue, 3 lives
- **distance** — pin capitals on map. Scored 0-100 per question using normalized distance. 4 difficulty tiers with progressive question ordering. Review phase before results.

### Difficulty systems

**Country difficulty** (`lib/countryDifficulty.ts`): 4 tiers for country identification games. Filters the country pool.

**Capital difficulty** (`lib/distanceScoring.ts`): 4 tiers for distance mode. Controls question count (easy=10, medium=20, hard=30, expert=40) and progressive ordering (starts easy, ramps up within each game).

**Distance scoring**: `normalizedKm = rawKm × (250 / countryRadius)` where `countryRadius = √(area/π)`. Penalizes misses in small countries, discounts in large ones. Score = `100 × e^(-(normalizedKm-10)/500)`, capped at 100 for <10km.

### Flag hint system

`lib/flagHints.ts`:
- ISO A3→A2 mapping for 197 flag file paths
- 27 lookalike flag groups (visually similar flags)
- 3 hint tiers: continent elimination → lookalike preservation → aggressive narrowing
- `getFlagUrl(name, isoA3)` returns `/flags/4x3/{code}.svg`

### Internationalization

`lib/i18n/`:
- `types.ts` — `Locale` type, `Translations` interface (~120 keys)
- `translations.ts` — all 6 languages, `LOCALE_LABELS`, `LOCALE_FLAGS`
- `countries.ts` — 197 country names × 5 languages (985 translations)
- `context.tsx` — `I18nProvider`, `useTranslation()` hook returning `t(key)` and `tc(countryName)`
- Locale persisted to `localStorage` as `woc-locale`

### Sound system

`lib/sounds.ts`:
- All SFX synthesized via Web Audio API (oscillators + gain envelopes + delay echo)
- Effects: `playCorrect`, `playWrong`, `playGameStart` (deep echo melody), `playGameOver`, `playClick`, `playEnter` (sweep), `playSkip`, `playHintUsed`, `playHintEarned`, `playHighScore`, `playLifeLost`, `playTick`
- Two background music tracks: menu (`/music/menu.mp3`) and in-game (`/music/background.mp3`)
- Crossfade between tracks, game music delayed 2s with fade-in
- Mute toggle persisted to `localStorage` as `woc-sound`

### Data files

- `lib/capitals.ts` — 197 capital cities with lat/lng coordinates, haversine distance function, distance formatter
- `lib/distanceScoring.ts` — 197 country areas (km²), 197 capital tier assignments, normalized distance + score functions
- `lib/countryDifficulty.ts` — 197 country tier assignments for identification games
- `lib/flagHints.ts` — ISO code mappings, lookalike groups, hint elimination logic

### Persistence

All localStorage, keyed by:
- `woc-highscores` → `{mode}:{difficulty}:{variant}` — click-country and flag mode scores
- `woc-distance-scores:{difficulty}` — distance mode scores (sorted by highest total)
- `woc-locale` — language preference
- `woc-sound` — sound on/off
- `woc-distance-unit` — km or miles
- `woc-player-name` — last entered name
- `woc-theme` — dark/light theme
- `woc-pending-signup` — pending signup data (nickname + avatar)

### Design system

"Tactile Cartography" theme defined in `tailwind.config.ts`:
- Color palette: `geo-*` tokens (bg, surface, primary, secondary, tertiary, error, etc.)
- Fonts: Plus Jakarta Sans (`font-headline`) for headings, Be Vietnam Pro (`font-body`) for body
- Component classes in `globals.css`: `glass-panel`, `btn-primary`, `btn-secondary`, `btn-ghost`, `text-glow-*`
- Distance mode popup styling: `.distance-popup` class for MapLibre popups
- Custom `next.config.js` webpack rule for `.geojson` imports as JSON

### Responsive design

Mobile-first responsive layout using Tailwind breakpoints:
- Default (< 640px): Mobile phones portrait/landscape
- `sm:` (640px): Small tablets
- `lg:` (1024px): 1080p desktop monitors
- `2xl:` (1536px): 1440p/4K monitors

Key patterns:
- Game mode cards use `w-full aspect-square` (not fixed pixel sizes)
- Grids collapse: `grid-cols-2 sm:grid-cols-3` for game modes, `grid-cols-2 sm:grid-cols-4` for difficulty selectors
- TopBar scales down on mobile with `scale-[0.85] sm:scale-100`
- All interactive elements maintain minimum 44px touch targets on mobile
- Text scales progressively: e.g. `text-base sm:text-lg 2xl:text-2xl`

### Auth status

Login/signup is **temporarily disabled** — `UserBadge` returns `null` for guests. `AuthModal` component still exists but is not rendered. Re-enable by restoring the sign-in button in `UserBadge.tsx` guest branch.

### Component inventory

**Shared**: `Providers` (I18nProvider wrapper), `LanguageSelector`, `SoundToggle`

**Game shared**: `QuestionCard`, `FeedbackOverlay` (with flag display on correct), `ScoreBoard`, `ResultScreen`

**Flag-specific**: `FlagQuestionCard` (flag image, hints, skip, progress)

**Distance-specific**: `CityQuestionCard` (city/country, progress dots), `DistanceFeedback` (raw distance → correction → score with shoutouts)

### Path alias

`@/*` maps to `./src/*` (tsconfig paths).

## Key Conventions

- TypeScript strict — no `any`
- Functional components only, custom hooks for business logic
- `PascalCase` components, `camelCase` hooks/utils
- Tailwind only — use `cn()` from `lib/cn.ts` for conditional classes
- MapLibre instance in `useRef`, never `useState`
- For map click handlers that need current React state, use refs (`phaseRef`, etc.) to avoid stale closures
- Game logic in `lib/gameEngine.ts` — pure functions, no side effects
- All map visual feedback through `setFeatureState`, never direct style mutation
- Country identification uses `ADMIN` property from GeoJSON (full English name)
- All user-facing strings go through `t()` from `useTranslation()`; country names through `tc()`
- Confirmation dialogs required for quit AND restart during gameplay
- Conventional commits: `type(scope): subject`
- Feature branches from main, squash merge
