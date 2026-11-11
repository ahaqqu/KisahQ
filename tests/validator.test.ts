import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateRepo, validateStoryDir } from '../scripts/validate-stories.mjs'

/**
 * The validator IS the story-factory CI gate: these tests pin the gates
 * (hikmah both languages, i18n parity, scene limits, character refs, baked
 * audio consistency, adab warning) so stories cannot silently weaken them.
 */

let fixtureRoot: string

function writeStory(slug: string, story: object): void {
  const dir = join(fixtureRoot, 'stories', slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'story.json'), JSON.stringify(story, null, 2))
}

function writeCharacter(id: string): void {
  mkdirSync(join(fixtureRoot, 'characters'), { recursive: true })
  writeFileSync(
    join(fixtureRoot, 'characters', `${id}.json`),
    JSON.stringify({
      id,
      name: `Karakter ${id}`,
      species: 'Hewan cerita',
      role: { id: 'Peran percobaan', en: 'A test role' },
      traits: ['ramah'],
      artNotes: 'Test art notes.',
    }),
  )
}

function validStory(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const scene = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    bg: 'orchard',
    actors: [{ character: 'toto', pose: 'idle' }],
    narration: { id: `Narasi ${id} dengan Bismillah.`, en: `Narration for ${id}.` },
    interactions: [
      { type: 'tap', target: 'toto', praise: { id: 'Hebat!', en: 'Great!' } },
    ],
    audio: { mode: 'tts', captions: [] },
    ...extra,
  })
  return {
    slug: 'kisah-uji',
    title: { id: 'Kisah Uji', en: 'Test Story' },
    ageBand: '3-4',
    characters: ['toto'],
    scenes: [
      scene('pembuka'),
      scene('scene-2'),
      scene('scene-3'),
      scene('scene-4'),
      scene('scene-5'),
      scene('penutup', { sfx: 'sparkle' }),
    ],
    hikmah: {
      id: 'Hikmah uji.',
      en: 'Test hikmah.',
      prompts: [{ id: 'Prompt?', en: 'Prompt?' }],
    },
    ...overrides,
  }
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'kisahq-validator-'))
  writeCharacter('toto')
  writeCharacter('lili')
  writeStory('kisah-uji', validStory())
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

describe('validateStoryDir (happy path)', () => {
  it('accepts a complete valid story', () => {
    const story = JSON.parse(
      readFileSync(join(fixtureRoot, 'stories', 'kisah-uji', 'story.json'), 'utf8'),
    ) as { slug: string }
    expect(story.slug).toBe('kisah-uji')
    const { errors } = validateStoryDir(join(fixtureRoot, 'stories', 'kisah-uji'), new Set(['toto']))
    expect(errors).toEqual([])
  })
})

describe('validator gates (CI-blocking)', () => {
  it('rejects a hikmah missing the English sentence', () => {
    const story = validStory({ hikmah: { id: 'Ada.', en: '', prompts: [{ id: 'a', en: 'b' }] } })
    writeStory('tanpa-hikmah-en', story)
    const { errors } = validateStoryDir(join(fixtureRoot, 'stories', 'tanpa-hikmah-en'), new Set(['toto']))
    expect(errors.join('\n')).toMatch(/hikmah\.en/)
  })

  it('rejects narration missing one language', () => {
    const story = validStory()
    const scenes = story.scenes as Array<{ narration: Record<string, string> }>
    delete scenes[0].narration.en
    writeStory('narrasi-bolong', story)
    const { errors } = validateStoryDir(join(fixtureRoot, 'stories', 'narrasi-bolong'), new Set(['toto']))
    expect(errors.join('\n')).toMatch(/narration/)
  })

  it('rejects fewer than 6 scenes and more than 12', () => {
    writeStory('terlalu-sedikit', validStory({ scenes: (validStory().scenes as unknown[]).slice(0, 5) }))
    const few = validateStoryDir(join(fixtureRoot, 'stories', 'terlalu-sedikit'), new Set(['toto']))
    expect(few.errors.join('\n')).toMatch(/scenes/)

    const many = Array.from({ length: 13 }, (_, i) => ({
      id: `scene-${i}`,
      bg: 'orchard',
      actors: [],
      narration: { id: `n${i}`, en: `n${i}` },
      interactions: [{ type: 'tap', target: 'tree', praise: { id: 'p', en: 'p' } }],
    }))
    writeStory('terlalu-banyak', validStory({ scenes: many }))
    const tooMany = validateStoryDir(join(fixtureRoot, 'stories', 'terlalu-banyak'), new Set(['toto']))
    expect(tooMany.errors.join('\n')).toMatch(/scenes/)
  })

  it('rejects a scene with more than one interaction', () => {
    const story = validStory()
    ;(story.scenes as Array<{ interactions: unknown[] }>)[0].interactions.push({
      type: 'tap',
      target: 'tree',
      praise: { id: 'x', en: 'y' },
    })
    writeStory('interaksi-ganda', story)
    const { errors } = validateStoryDir(join(fixtureRoot, 'stories', 'interaksi-ganda'), new Set(['toto']))
    expect(errors.join('\n')).toMatch(/interactions/)
  })

  it('rejects character refs without a characters/ file and unstable slugs', () => {
    const story = validStory({ slug: 'kisah-uji', characters: ['toto', 'hantu-tidak-ada'] })
    writeStory('karakter-hilang', story)
    const missing = validateStoryDir(join(fixtureRoot, 'stories', 'karakter-hilang'), new Set(['toto']))
    expect(missing.errors.join('\n')).toMatch(/hantu-tidak-ada/)

    const unstable = validStory({ slug: 'bukan-slug-ini' })
    writeStory('slug-lain', unstable)
    const slugError = validateStoryDir(join(fixtureRoot, 'stories', 'slug-lain'), new Set(['toto']))
    expect(slugError.errors.join('\n')).toMatch(/does not match directory name/)
  })

  it('warns (not errors) when a story has no adab moment', () => {
    const story = validStory({ slug: 'tanpa-adab' })
    for (const scene of story.scenes as Array<{ narration: Record<string, string> }>) {
      scene.narration = { id: 'Narasi tanpa adab.', en: 'Narration without adab.' }
    }
    writeStory('tanpa-adab', story)
    const { errors, warnings } = validateStoryDir(join(fixtureRoot, 'stories', 'tanpa-adab'), new Set(['toto']))
    expect(errors).toEqual([])
    expect(warnings.join('\n')).toMatch(/adab/)
  })

  it('rejects baked mode without the mp3 + caption window', () => {
    const story = validStory()
    const scenes = story.scenes as Array<{ audio: Record<string, unknown> }>
    scenes[0].audio = { mode: 'baked', captions: [] }
    writeStory('baked-bolong', story)
    const { errors } = validateStoryDir(join(fixtureRoot, 'stories', 'baked-bolong'), new Set(['toto']))
    const joined = errors.join('\n')
    expect(joined).toMatch(/baked audio missing/)
    expect(joined).toMatch(/caption/)
  })
})

describe('validateRepo', () => {
  it('validates the whole fixture tree and flags unknown files', () => {
    const { errors } = validateRepo(fixtureRoot)
    // Known problem children written by the gate tests above exist on purpose;
    // the happy-path story must not contribute errors.
    const happyPathErrors = errors.filter((error) => error.startsWith('kisah-uji'))
    expect(happyPathErrors).toEqual([])
  })

  it('errors when no story exists at all', () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'kisahq-empty-'))
    try {
      mkdirSync(join(emptyRoot, 'stories'))
      const { errors } = validateRepo(emptyRoot)
      expect(errors.join('\n')).toMatch(/no story found/)
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true })
    }
  })
})
