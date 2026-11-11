# KisahQ

KisahQ is an **interactive toddler story app for ages 2–5** — children play AND
learn: KisahQ stories are playable picture books with narration, tap
interactions, and an explicit **Hikmah** ending (one moral sentence + parent
discussion prompts). Indonesian is the primary language (English secondary,
full parity CI-enforced). Web app served by a Cloudflare Worker (static assets)
at **kisahq.ahaqqu.com**.

## Product principles

- **Narration-first**: no reading required — Web Speech narration (id-ID
  preferred), tap to replay, karaoke word highlight.
- **Positive-only feedback**: no fail states, no timers; big (≥64px) tap
  targets; one interaction per scene step.
- **The book is the toy**: 3D page-flip, character idle loops + randomized tap
  reactions, 3-layer parallax — every animation answers a child action or aids
  narration.
- **Islamic + Nusantara native**: adab woven into the beats (bismillah opener,
  salam greeting, alhamdulillah close), kampung/sawah settings, batik accent
  art, gamelan-flavored WebAudio stingers.
- **Hikmah-first**: no story ships without its hikmah (CI-enforced) + parent
  prompts; finished stories earn batik-star stickers in the Album Hikmah.
- **Zero telemetry**: no ads, no analytics, no cookies beyond language/audio
  preferences in localStorage; settings (language, audio provider) sit behind a
  long-press parent gate.

## The repo is the story factory

Structured story format + Zod validator + template + scaffolder: creating a
story = branch → content file → `npm run validate:stories` → PR → merge =
story live. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the story workflow
and **[docs/TOOLING.md](docs/TOOLING.md)** for tooling choices and rationale.

## Development

```sh
npm ci
npm run dev                  # story player dev server
npm run build                # production build (dist/)
npm run check                # typecheck
npm test                     # unit tests
npm run validate:stories     # story-factory CI gate
```

## Deploy

`./scripts/deploy.sh cloudflare` (single entrypoint; `--dry-run` to validate).
Assets-only Worker, custom domain `kisahq.ahaqqu.com` — no VPS/nginx changes.
