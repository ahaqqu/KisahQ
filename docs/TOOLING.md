# TOOLING — choices, rationale, sources

The owner directive: popular open-source tooling, picked with research, reasons
recorded. Researched 2026-11-11; versions are pinned exactly in `package.json`.

## Build: **Vite 8 + vanilla TypeScript** (Astro rejected)

A KisahQ story is **one continuously-interactive screen** (book player). Astro's
strengths — static HTML per page, content collections, islands hydration for
occasional interactivity — solve problems this product does not have: there are
no content pages to index and no "some interactive islands"; the whole app is
interactivity. A plain Vite SPA is the simpler, smaller mental model: one
`index.html`, one TS app, no framework runtime at all.

**Vanilla TS over Preact**: the player's state is tiny (current scene, tap
progress, language). A framework runtime buys nothing here and costs bundle
bytes on family phones; hand-rolled render functions keep the app
dependency-free at runtime.

Sources: [Astro vs React SPA comparison](https://komalnakrani.com/blog/astro-vs-vite-react-spa)
("choose an SPA when most pages need JS anyway"), [r/javascript — Vite vs CRA/SPA discussion](https://www.reddit.com/r/javascript/comments/u8m6c8/askjs_is_vite_better_than_using_create_react_app).

## i18n: **minimal typed dictionary** (i18next rejected)

i18next core is ~13–15 kB gzipped before plugins and adds runtime machinery
(interpolation, namespaces, backends) this app does not use. Two facts make the
typed dictionary clearly lighter:

1. Story-content i18n parity (the hard requirement) is **enforced by the Zod
   validator in CI**, not by an i18n runtime — story.json carries `id`/`en`
   fields that must both exist.
2. The UI chrome is ~30 strings; a typed `satisfies Record<Lang, ...>`
   dictionary gives compile-time key checking and zero bundle cost.

Sources (bundle-size figures from two independent roundups surfaced in the
research pass): Phrase's "React i18n libraries roundup" (i18next ~15.1 kB
minified+gzipped) and a dev.to piece "Why I ditched i18next for native
JavaScript" (~41.6 kB minified; argues small apps skip the library).
Compiler-based alternatives (Paraglide JS, Intlayer) were considered; they need
a build step for marginal benefit over a plain typed object this small.

## Schema/validation: **Zod 4** — chosen

`scripts/validate-stories.mjs` is the CI gate for the story factory. Zod is the
TS-ecosystem default for runtime schema validation, gives precise error paths
for content authors (e.g. `scenes.2.narration.en: required`), and validates
cross-file rules (characters, baked audio) composed on top of the base schema.
`npm run validate:stories` runs in CI on every PR.

## Narration/audio: **pluggable AudioProvider registry** (per the brief)

Resolution per line: baked `stories/<slug>/audio/<lang>/<scene>.mp3` → selected
provider → silent playback with captions (never broken).

- `browser` (default, free): Web Speech API, `id-ID` voice preferred, word
  boundary events drive the karaoke highlight.
- `google` (Google Cloud TTS, Chirp 3 HD id-ID) and `elevenlabs` (multilingual,
  most expressive Indonesian): fully wired, but keyless-ok — without a key
  entered in the parent-gate "Suara" tab they are never selected. Keys live
  ONLY in the parent's browser localStorage; never in the repo, CI, or logs.
- Baking: `scripts/generate-audio.mjs` runs locally by the owner with keys from
  shell env (`GOOGLE_TTS_KEY` / `ELEVENLABS_KEY`); caption timings are exact
  with `ffprobe`, word-count estimates otherwise. Never runs in CI.

Karaoke limitation recorded: live HTTP TTS providers cannot emit word-boundary
events, so their highlight is an interpolated sweep; the browser provider is
exact (`onboundary`), baked audio uses caption windows.

## Story engine: **linear scene player** (ink/inkjs, Twine rejected)

ink/inkjs and Twine are built for **nonlinear, branching** narratives (CYOA/
hypertext graphs). A KisahQ story for ages 2–5 is a strictly linear loop of
6–10 scenes with exactly one positive tap interaction per step — there is no
branching to model. A ~400-line hand-rolled scene player (page-flip, karaoke,
tap reactions) replaces a full narrative runtime with zero dependencies, and
the story schema stays a plain JSON file a parent can read.

Sources: [Twine — nonlinear stories](https://twinery.org), [ink — inkle's narrative scripting language](https://www.inklestudios.com/ink), [Emily Short — choice-based narrative tools](https://emshort.blog/2012/11/10/choice-based-narrative-tools-twine), [intfiction.org — Twine for interactive novels](https://intfiction.org/t/interactive-novels/50756).

## Art: **hand-coded flat SVG** — chosen

No external asset downloads: characters/backgrounds are inline SVG builders in
`src/art/` (warm pastels, batik accent motifs, big shapes, big friendly eyes).
Idle loops, tap reactions, and parallax are CSS/JS on top of the SVG groups.
No Kenney CC0 packs used yet, so no ATTRIBUTION file is needed.

## Sound: **WebAudio synthesis** — chosen

Gamelan/angklung-flavored scene stingers and the page-turn whoosh are
synthesized (paired slightly-detuned sine plucks; filtered-noise whoosh) — zero
audio assets, zero downloads.

## Deploy: **assets-only Cloudflare Worker** (per the brief)

`wrangler.jsonc` declares an assets-only Worker (`dist/` as static assets, SPA
fallback) on the custom domain `kisahq.ahaqqu.com` (`custom_domain = true`, DNS
auto-created in the ahaqqu.com zone). No worker script, no server logic, no
telemetry. Deploy = `./scripts/deploy.sh cloudflare` (single entrypoint).
