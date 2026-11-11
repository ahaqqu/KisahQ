# Contributing — KisahQ story factory

KisahQ is an interactive toddler story app (ages 2–5): Indonesian-first (EN
secondary), narration-first, positive-only feedback, zero telemetry, and every
kisah ends on a Hikmah screen with parent prompts. **The repo IS the story
factory**: creating a new story is a content PR, not a code change.

## How to add a story (the routine workflow)

1. **Branch**: `git checkout -b feat/story-<slug>` (slug: stable kebab-case,
   e.g. `berbagi-rambutan`).
2. **Scaffold**: `npm run new-story -- <slug>` — copies the validated template
   to `stories/<slug>/story.json`.
3. **Write the story** in `stories/<slug>/story.json`:
   - Every narration line, praise, and the hikmah in **BOTH** languages
     (Indonesian is what the child sees first — write it first, write it well).
   - **6–12 scenes**, exactly **one interaction per scene** (`tap` a character/
     prop or `count` 2–10 items). Positive-only: no fail states, no timers.
   - Session length ≤ ~5 min.
   - **Adab in the beats**: open with "Bismillah… yuk mulai!", greet with
     "Assalamualaikum", wash hands + bismillah before eating, close with
     "Alhamdulillah". The validator warns if a story has none.
   - **Hikmah**: one sentence + 1–3 parent discussion prompts, both languages.
     CI fails without it — no story ships without its hikmah.
   - Cast: general stories use animal/folktale characters from `characters/`;
     personal stories star the family canon (Qila & Ezra) and must stay
     consistent with their canon files (traits verbatim, Ezra's dimples in art
     notes).
4. **Validate**: `npm run validate:stories` — fixes are printed with JSON paths.
5. **Play it**: `npm run dev`, then `npm run build` if you touched art/engine.
6. **Optional — baked audio** (owner only, never CI): with keys from the shell,
   `GOOGLE_TTS_KEY=... node scripts/generate-audio.mjs <slug>` bakes
   `audio/<lang>/<scene>.mp3` + caption windows; the validator checks
   baked-audio ↔ caption consistency.
7. **PR**: open it against `main`, link the tracking issue, CI must be green.
   Merging = story live.

## Adding a new character

`characters/<id>.json` (id = file name): name, species, role (both languages),
traits, artNotes. Personal-canon characters (Qila, Ezra) are owner-provided —
keep their trait lists verbatim.

## Engine keys (for scene authors)

- Interaction `target`: a character id in that scene's `actors`, or an
  engine-known prop: `tree`, `basket`, `fruits`, `water` (see
  `src/art/props.ts` `KNOWN_PROPS`).
- Backgrounds: `orchard` (kampung + sawah + rambutan tree). New backgrounds
  need an art addition in `src/art/backgrounds.ts`.
- Poses: `idle`, `happy`, `wave`, `jump`. SFX: `pop`, `chime`, `shake`,
  `whoosh`, `pluck`, `sparkle`.

## Non-negotiables (checked by humans and CI)

- Hikmah in both languages (CI-enforced).
- Full id/en parity on every narration/praise/prompt (CI-enforced).
- Positive-only feedback; no fail states; no timers; no leaderboards.
- No reading required: narration-first; tap replays.
- No visible external links to the child; settings/language/audio behind the
  long-press parent gate; **zero telemetry/analytics/cookies** beyond the
  language + audio preferences in localStorage.
- No secrets, keys, or PII anywhere in the repo (audio provider keys live in
  the parent's browser / owner shell only).

## Development

```sh
npm ci                 # install pinned dependencies
npm run dev            # Vite dev server
npm run build          # production build (dist/) incl. stories copy
npm run check          # tsc --noEmit
npm run test           # vitest
npm run validate:stories
npm run deploy -- cloudflare  # via scripts/deploy.sh (maintainer)
```

Commits: conventional commits. Never push directly to `main` — PRs only, and
the GitHub Action must pass before merge.
