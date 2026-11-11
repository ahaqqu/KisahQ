import type { LocalizedText, Story } from './types'

/**
 * App-side story registry. The repo is the story factory: adding a story =
 * add `stories/<slug>/story.json` (validated by CI) + register the slug here
 * AND its title in STORY_TITLES below (the compiler forces both).
 */
export const REGISTERED_STORIES = ['berbagi-rambutan', 'qila-ezra-truk-hilang'] as const

export type RegisteredSlug = (typeof REGISTERED_STORIES)[number]

/**
 * Start-screen title manifest: each registered slug's title as story CONTENT
 * (mirrors the `title` field of `stories/<slug>/story.json` — NOT a UI i18n
 * key). The start screen must render synchronously without fetching any
 * story.json (the loader's lazy-fetch design: story data loads only when a
 * story is opened), so titles are pinned statically here; the compile-time
 * `Record<RegisteredSlug, …>` key forces an entry per registered slug, and
 * tests/start-buttons.test.ts fails CI if the manifest ever drifts from the
 * story.json titles.
 */
export const STORY_TITLES: Record<RegisteredSlug, LocalizedText> = {
  'berbagi-rambutan': { id: 'Berbagi Rambutan', en: 'Sharing Rambutan' },
  'qila-ezra-truk-hilang': {
    id: 'Qila dan Ezra: Truk Ezra Hilang!',
    en: "Qila and Ezra: Ezra's Truck Is Missing!",
  },
}

/**
 * Light structural check (NOT the enforcement layer — that is the Zod
 * validator in CI). Story JSON comes from our own build output, so the client
 * stays dependency-free (no zod in the bundle).
 */
function assertStoryShape(value: unknown, slug: string): asserts value is Story {
  const story = value as Story | undefined
  if (
    !story ||
    typeof story !== 'object' ||
    story.slug !== slug ||
    typeof story.title?.id !== 'string' ||
    typeof story.title?.en !== 'string' ||
    !Array.isArray(story.scenes) ||
    story.scenes.length === 0 ||
    typeof story.hikmah?.id !== 'string' ||
    typeof story.hikmah?.en !== 'string'
  ) {
    throw new Error(`Kisah tidak valid: stories/${slug}/story.json`)
  }
}

export async function loadStory(slug: string): Promise<Story> {
  const response = await fetch(`stories/${slug}/story.json`)
  if (!response.ok) {
    throw new Error(`Kisah tidak ditemukan: ${slug}`)
  }
  const json: unknown = await response.json()
  assertStoryShape(json, slug)
  return json
}
