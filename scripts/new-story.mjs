#!/usr/bin/env node
// Story scaffolder: npm run new-story -- <slug>
// Copies stories/_template/story.json to stories/<slug>/story.json with the
// slug substituted, so the new story starts green in `npm run validate:stories`.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const slug = process.argv[2]

if (!slug || !SLUG_RE.test(slug)) {
  console.error('Usage: npm run new-story -- <slug>   (kebab-case, e.g. qila-dan-ezra)')
  process.exit(1)
}

const storyDir = join(rootDir, 'stories', slug)
if (existsSync(storyDir)) {
  console.error(`stories/${slug} already exists — pick another slug or edit the story in place.`)
  process.exit(1)
}

const template = readFileSync(join(rootDir, 'stories', '_template', 'story.json'), 'utf8')
const storyJson = template.replace(/SLUG_PLACEHOLDER/g, slug)

mkdirSync(storyDir, { recursive: true })
writeFileSync(join(storyDir, 'story.json'), storyJson)

console.log(`Created stories/${slug}/story.json`)
console.log(`
Next steps (see CONTRIBUTING.md for the full story workflow):
  1. Replace every TODO in stories/${slug}/story.json (narration, praise, hikmah — both languages).
  2. Reference only characters that exist in characters/ (Qila/Ezra for personal stories, animals for general ones).
  3. Keep every adab beat: bismillah opener, salam greeting, alhamdulillah close.
  4. npm run validate:stories
  5. Play it: npm run dev
  6. Open a PR (branch feat/story-<slug>) — merging = story live.
`)
