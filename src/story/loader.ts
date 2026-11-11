import type { Story } from './types'

/**
 * App-side story registry. The repo is the story factory: adding a story =
 * add `stories/<slug>/story.json` (validated by CI) + register the slug here.
 */
export const REGISTERED_STORIES = ['berbagi-rambutan'] as const

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
