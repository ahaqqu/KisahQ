import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadStory, REGISTERED_STORIES } from '../src/story/loader'
import { CHARACTERS } from '../src/art/characters'
import { renderBackground, type BackgroundKey } from '../src/art/backgrounds'

/**
 * Registration pins — the app-side wiring that makes a story PLAYABLE: a
 * registered slug must resolve through the real loader, every cast id must
 * resolve from the merged CHARACTERS registry and render every pose, and
 * every scene bg must render the 3-layer parallax without throwing. These
 * pins walk BOTH registered stories, so registering a story without shipping
 * its art fails here.
 */

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const POSES = ['idle', 'happy', 'wave', 'jump'] as const

interface StoryJson {
  slug: string
  characters: string[]
  scenes: Array<{ id: string; bg: string; actors: Array<{ character: string }> }>
}

function readStoryJson(slug: string): StoryJson {
  return JSON.parse(readFileSync(join(ROOT, 'stories', slug, 'story.json'), 'utf8')) as StoryJson
}

// The loader fetches 'stories/<slug>/story.json' relative to the site root;
// in tests the fetch is stubbed to read the same path from the repo root, so
// the pin exercises the REAL loadStory path (response.ok + JSON parse).
const realFetch = globalThis.fetch
beforeAll(() => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const rel = url.replace(/^https?:\/\/[^/]+\//, '')
    try {
      return new Response(readFileSync(join(ROOT, rel), 'utf8'), { status: 200 })
    } catch {
      return new Response('not found', { status: 404 })
    }
  }) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = realFetch
})

describe('slug registration — every registered story resolves through the loader', () => {
  it('registers exactly the three shipped stories, in order', () => {
    expect([...REGISTERED_STORIES]).toEqual([
      'berbagi-rambutan',
      'qila-ezra-truk-hilang',
      'assalamualaikum-satu-senyum-damai',
    ])
  })

  for (const slug of REGISTERED_STORIES) {
    it(`loadStory('${slug}') resolves and the slug matches its directory`, async () => {
      const story = await loadStory(slug)
      expect(story.slug).toBe(slug)
      expect(story.scenes.length).toBeGreaterThanOrEqual(6)
    })
  }

  it('an unknown slug still throws (registry gate stays closed)', async () => {
    await expect(loadStory('bukan-kisah')).rejects.toThrow('Kisah tidak ditemukan')
  })
})

describe('cast registration — every story actor resolves by id and renders', () => {
  for (const slug of REGISTERED_STORIES) {
    it(`${slug}: all cast + scene actors render every pose from CHARACTERS`, () => {
      const story = readStoryJson(slug)
      const ids = [
        ...new Set([...story.characters, ...story.scenes.flatMap((scene) => scene.actors.map((actor) => actor.character))]),
      ]
      expect(ids.length).toBeGreaterThan(0)
      for (const id of ids) {
        const def = CHARACTERS[id]
        expect(def, `CHARACTERS["${id}"] must exist for ${slug}`).toBeDefined()
        for (const pose of POSES) {
          let svg = ''
          expect(() => {
            svg = def.render(pose)
          }, `${id}.render('${pose}')`).not.toThrow()
          expect(svg).toContain('<svg')
        }
      }
    })
  }

  it('merges the story-2 cast without disturbing the story-1 entries', () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual(['ezra', 'lili', 'momo', 'nana', 'qila', 'toto'])
    expect(CHARACTERS.toto.name).toBe('Toto si Kura-kura')
    expect(CHARACTERS.lili.name).toBe('Lili si Kelinci')
    expect(CHARACTERS.nana.name).toBe('Nana si Burung Hantu')
    expect(CHARACTERS.momo.name).toBe('Momo si Siput')
  })

  it('registry names match the character sheets for the story-2 cast', () => {
    for (const id of ['qila', 'ezra'] as const) {
      const sheet = JSON.parse(readFileSync(join(ROOT, 'characters', `${id}.json`), 'utf8')) as {
        name: string
      }
      expect(CHARACTERS[id].name).toBe(sheet.name)
    }
  })
})

describe('background registration — every scene bg renders the 3 parallax layers', () => {
  for (const slug of REGISTERED_STORIES) {
    it(`${slug}: renderBackground on every scene bg without throwing`, () => {
      const story = readStoryJson(slug)
      for (const scene of story.scenes) {
        const layers = renderBackground(scene.bg as BackgroundKey)
        expect(layers.map((layer) => layer.className), `${slug}/${scene.id}`).toEqual([
          'bg-layer bg-layer--far',
          'bg-layer bg-layer--mid',
          'bg-layer bg-layer--near',
        ])
        for (const layer of layers) expect(layer.svg).toContain('<svg')
      }
    })
  }
})

describe('story 2 — the flagged orchard placeholder is gone, scene by scene', () => {
  it('never references the orchard placeholder', () => {
    const story = readStoryJson('qila-ezra-truk-hilang')
    expect(readFileSync(join(ROOT, 'stories', 'qila-ezra-truk-hilang', 'story.json'), 'utf8')).not.toContain('orchard')
    for (const scene of story.scenes) expect(scene.bg).not.toBe('orchard')
  })

  it('uses only the Bold Flat Pop room keys', () => {
    const story = readStoryJson('qila-ezra-truk-hilang')
    expect(new Set(story.scenes.map((scene) => scene.bg))).toEqual(new Set(['kamar-ezra', 'ruang-tamu']))
  })

  it('pins the bg to the room each beat narrates', () => {
    const story = readStoryJson('qila-ezra-truk-hilang')
    const bgOf = (id: string) => {
      const scene = story.scenes.find((entry) => entry.id === id)
      expect(scene, `scene ${id} exists`).toBeDefined()
      return scene!.bg
    }
    // The under-the-bed search plays in Ezra's bedroom.
    expect(bgOf('intip-tempat-tidur')).toBe('kamar-ezra')
    // The sofa-cushion shake plays in the living room.
    expect(bgOf('guncang-sofa')).toBe('ruang-tamu')
    // The day's build + close land in Ezra's room (evening window).
    expect(bgOf('rumah-truk')).toBe('kamar-ezra')
    expect(bgOf('syukur-penutup')).toBe('kamar-ezra')
  })
})
