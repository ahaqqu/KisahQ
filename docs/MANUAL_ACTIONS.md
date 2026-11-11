# Manual actions (owner)

Numbered IDs, referenced from tickets/PRs. Location-labeled (LAPTOP / CLOUD).

## A — First deploy of KisahQ (CLOUD + LAPTOP)

- A1 (CLOUD): Add a Cloudflare API token as the GitHub repo secret
  `CLOUDFLARE_API_TOKEN` on ahaqqu/KisahQ — needed for a future CI deploy job
  (no deploy job exists in CI yet, by design).
- A2 (LAPTOP): Run the first deploy locally: `./scripts/deploy.sh cloudflare`
  (requires `npx wrangler login` or `CLOUDFLARE_API_TOKEN` in the shell —
  `wrangler whoami` showed NOT AUTHENTICATED as of 2026-11-11). The Worker
  config (`wrangler.jsonc`) attaches the custom domain
  `kisahq.ahaqqu.com` with `custom_domain = true` (DNS auto-created in the
  ahaqqu.com zone — same mechanism as the RumaQ app Worker).
- A3 (LAPTOP/CLOUD): Verify https://kisahq.ahaqqu.com after deploy (story
  playable, narration works, no console errors).

## B — Optional: baked narration audio (LAPTOP, later)

- B1 (LAPTOP): If recorded-quality narration is wanted, bake MP3s locally:
  `GOOGLE_TTS_KEY=... node scripts/generate-audio.mjs berbagi-rambutan` or
  `ELEVENLABS_KEY=... node scripts/generate-audio.mjs berbagi-rambutan
  --provider elevenlabs`. Keys come from the shell only, never files.
- B2 (LAPTOP): Without keys, no action needed — the app defaults to the free
  device voice (Web Speech) and works fully.
