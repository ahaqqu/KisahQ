// @ts-check
import { defineConfig } from 'vite'
import { readdirSync, cpSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * The repo is the story factory: story content lives at the repo root in
 * `stories/` (canonical, validator-targeted) and `characters/`, and is copied
 * verbatim into `dist/` at build time so the app can fetch it at runtime.
 * Directories starting with `_` (e.g. `stories/_template`) are scaffolding and
 * are not shipped.
 */
function copyStoryContent() {
  /** @type {string} */
  const root = resolve(import.meta.dirname)
  /** @param {string} srcDir @param {string} destDir */
  function copyContentDir(srcDir, destDir) {
    mkdirSync(destDir, { recursive: true })
    for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue
      cpSync(join(srcDir, entry.name), join(destDir, entry.name), { recursive: true })
    }
  }
  return {
    name: 'copy-story-content',
    closeBundle() {
      copyContentDir(join(root, 'stories'), join(root, 'dist', 'stories'))
      copyContentDir(join(root, 'characters'), join(root, 'dist', 'characters'))
    },
  }
}

export default defineConfig({
  plugins: [copyStoryContent()],
})
