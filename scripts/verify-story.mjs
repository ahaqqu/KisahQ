#!/usr/bin/env node
// Real-browser verification probe (thermos D1/D2 verification method).
// Zero dependencies: drives /usr/bin/chromium over raw CDP (Node's built-in
// WebSocket) at 320x568, taps through ALL of Story 1 with REAL coordinate
// mouse events (synthetic el.click() would bypass the elementFromPoint
// hit-test that caught the D1 soft-lock), and asserts:
//   (a) all five count fruits collect on scene 5
//   (b) scene 5 completes (progress advances to scene 6)
//   (c) the Hikmah screen renders after the celebration
//   (d) every .fruit-hit hit circle renders >= 64px in the real layout
//       (scrollbar-aware: the classic scrollbar shrinks the strip)
//   (e) no uncaught page errors (Runtime.exceptionThrown / console.error)
//       during the whole run — collected throughout, asserted at the end
// plus: elementFromPoint at every fruit center resolves inside .count-fruit.
//
// E1 freshness guard: the probe serves dist/ verbatim, so a stale dist would
// be probed (failure direction safe but confusing). Before serving, the newest
// mtime of the build inputs (index.html, src/, stories/, characters/, public/,
// skipping `_`/`.` entries like the build's content copy) is compared against
// dist/index.html — if anything is newer, or dist/ is missing, the probe exits
// early with a clear "run npm run build first" message. Choice: exit-early
// rather than auto-building, to keep the probe single-purpose and never hide
// build output inside a verification run.
//
// Usage: npm run verify:browser   (build first; CHROMIUM_BIN overrides the binary)

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const PORT = 4173
const CDP_PORT = 9223
const VIEWPORT = { width: 320, height: 568 }
const CHROMIUM_BIN =
  process.env.CHROMIUM_BIN ??
  ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((bin) => {
    try {
      spawnSync(bin, ['--version'])
      return true
    } catch {
      return false
    }
  })

if (!CHROMIUM_BIN) {
  console.error('verify:browser: no Chromium/Chrome binary found (set CHROMIUM_BIN).')
  process.exit(1)
}

// ---------------------------------------------------------------- freshness

/** Newest mtime under `dir`, skipping `_`/`.` entries (mirrors the build's content-copy rule). */
function newestMtime(dir) {
  let newest = 0
  const walk = (path) => {
    const stats = statSync(path)
    if (stats.isDirectory()) {
      for (const entry of readdirSync(path)) {
        if (entry.startsWith('_') || entry.startsWith('.')) continue
        walk(join(path, entry))
      }
    } else if (stats.mtimeMs > newest) {
      newest = stats.mtimeMs
    }
  }
  walk(dir)
  return newest
}

/** E1 guard: the probe serves dist/ verbatim — refuse to probe a stale or missing dist. */
function assertDistFresh() {
  const distIndex = join(DIST, 'index.html')
  if (!existsSync(distIndex)) {
    console.error('verify:browser: dist/index.html not found — run `npm run build` first.')
    process.exit(1)
  }
  const newestSource = Math.max(
    ...[join(ROOT, 'index.html'), ...['src', 'stories', 'characters', 'public'].map((dir) => join(ROOT, dir))].map(
      newestMtime,
    ),
  )
  if (newestSource > statSync(distIndex).mtimeMs) {
    console.error('verify:browser: dist/ is stale — a build input is newer than dist/index.html. Run `npm run build` first.')
    process.exit(1)
  }
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
}

function serveDist() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      let path = join(DIST, decodeURIComponent(url.pathname))
      if (url.pathname.endsWith('/')) path = join(path, 'index.html')
      let body = await readFile(path)
      if (!MIME[extname(path)]) {
        // SPA fallback for extension-less routes.
        body = await readFile(join(DIST, 'index.html'))
        res.writeHead(200, { 'Content-Type': MIME['.html'] })
      } else {
        res.writeHead(200, { 'Content-Type': MIME[extname(path)] })
      }
      console.log(`  serve: ${req.url} -> 200 (${MIME[extname(path)] ?? 'fallback'})`)
      res.end(body)
    } catch (error) {
      console.log(`  serve: ${req.url} -> 404 (${String(error).slice(0, 80)})`)
      res.writeHead(404)
      res.end('not found')
    }
  })
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function connectCdp() {
  let list
  for (let i = 0; i < 50; i += 1) {
    try {
      list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      if (list.some((t) => t.type === 'page')) break
    } catch {
      // Chromium not ready yet
    }
    await sleep(200)
  }
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target on the CDP endpoint')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('CDP websocket failed'))
  })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  } else if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params?.exceptionDetails?.exception?.description ?? 'page exception')
  } else if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    pageErrors.push(`console.error: ${JSON.stringify(message.params.args?.map((a) => a.value ?? a.description))}`)
  }
}
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  return { send, close: () => ws.close() }
}

// ------------------------------------------------------------------ probe

const failures = []
const passes = []
const pageErrors = []
function check(name, ok, detail = '') {
  if (ok) passes.push(name)
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
}

async function evalJs(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(`page evaluate failed: ${result.exceptionDetails.text}`)
  }
  return result.result?.value
}

async function waitForEval(cdp, expression, timeoutMs = 8000, label = expression) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evalJs(cdp, expression)
    if (value) return value
    await sleep(150)
  }
  const state = await evalJs(
    cdp,
    `JSON.stringify({
      url: location.href,
      ready: document.readyState,
      innerWidth: window.innerWidth,
      body: document.body ? document.body.innerText.slice(0, 200) : null,
    })`,
  ).catch((error) => `state dump failed: ${error.message}`)
  throw new Error(
    `timeout waiting for: ${label}\n  page state: ${state}${pageErrors.length ? `\n  page errors: ${pageErrors.slice(0, 3).join(' | ')}` : ''}`,
  )
}

/** REAL coordinate tap: goes through the browser hit-test (Input domain). */
async function tapAt(cdp, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      x,
      y,
      button: 'left',
      buttons: type === 'mousePressed' ? 1 : 0,
      clickCount: 1,
    })
    await sleep(60)
  }
}

async function tapCenter(cdp, selector, index = 0) {
  const rect = await waitForEval(
    cdp,
    `(() => {
      const els = document.querySelectorAll(${JSON.stringify(selector)});
      const el = els[${index}];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`,
    8000,
    `visible ${selector}[${index}]`,
  )
  await tapAt(cdp, rect.x, rect.y)
  return rect
}

async function activeSceneIndex(cdp) {
  return evalJs(
    cdp,
    `[...document.querySelectorAll('.progress-dots .dot')].findIndex((d) => d.classList.contains('dot--active'))`,
  )
}

// ------------------------------------------------------------------- main

assertDistFresh()
const server = await serveDist()
const profile = mkdtempSync(join(tmpdir(), 'kisahq-verify-'))
const chrome = spawn(CHROMIUM_BIN, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  '--remote-allow-origins=*',
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  'about:blank',
])
try {
  const cdp = await connectCdp()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  // mobile:false → classic (layout-consuming) scrollbar, the exact context
  // the reviewer measured the 61.2px failure in (overlay scrollbars would
  // hide the chain the pin is supposed to guard).
  const metricsParams = {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false,
    screenOrientation: { angle: 0, type: 'portraitPrimary' },
  }
  await cdp.send('Emulation.setDeviceMetricsOverride', metricsParams)
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
  // Headless clamps the window (min 500px) until the override lands on the
  // navigated page: re-apply after navigation, then wait for the APP (not the
  // racing about:blank readyState).
  await cdp.send('Emulation.setDeviceMetricsOverride', metricsParams)
  await waitForEval(
    cdp,
    `location.port === '${PORT}' && document.readyState === 'complete' && document.querySelector('.start-button') !== null`,
    15000,
    'app start screen',
  )

  // Start screen -> story (button carries its aria-label text).
  const innerWidth = await evalJs(cdp, `window.innerWidth`)
  check(
    'layout viewport is 320px minus scrollbar (CSS chain)',
    innerWidth > 300 && innerWidth <= VIEWPORT.width,
    `window.innerWidth=${innerWidth}`,
  )
  await tapCenter(cdp, '.start-button')

  // Scene 5 (index 4) is the count scene; scenes are 0-based dots.
  await waitForEval(cdp, `document.querySelector('.stage') !== null`, 8000, 'scene 1 stage')

  for (let scene = 0; scene < 9; scene += 1) {
    // Gate on the page-flip animation settling: mid-flip the page is rotated,
    // so elementFromPoint/taps follow transformed geometry and would race.
    await waitForEval(
      cdp,
      `!document.querySelector('.page--flip-in') && document.querySelectorAll('.page').length === 1`,
      4000,
      `scene ${scene + 1} flip settled`,
    )
    // (b) must be a real transition: the button is hidden at scene start
    // (re-hidden on every renderScene) and appears only after completion.
    const hiddenAtStart = await evalJs(
      cdp,
      `document.querySelector('.next-btn')?.classList.contains('hidden') ?? false`,
    )
    check(`(b-hidden) scene ${scene + 1} starts with the next button hidden`, hiddenAtStart === true)

    const isCountScene = scene === 4
    if (isCountScene) {
      // (d) real hit-circle diameter in the real layout (scrollbar-aware).
      const diameters = await waitForEval(
        cdp,
        `(() => {
          const widths = [...document.querySelectorAll('.fruit-hit')].map((c) => c.getBoundingClientRect().width);
          return widths.length === 5 ? widths : null;
        })()`,
        8000,
        'five fruit hit circles rendered on the count scene',
      )
      const min = Math.min(...diameters)
      check(
        '(d) hit-circle diameter >= 64px at 320x568 (scrollbar-aware)',
        diameters.length === 5 && min >= 64,
        `min=${min?.toFixed(1)}px over ${diameters?.length} circles`,
      )
      // D1 method, fruit circles: the CENTER of each isolated hit circle
      // must hit-test into that circle's own group (no overlaying box may
      // steal the center of a 64px target).
      const overlays = await evalJs(
        cdp,
        `[...document.querySelectorAll('.count-fruit')].map((g) => {
          const r = g.querySelector('.fruit-hit').getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit ? (hit.closest('.count-fruit') === g ? 'fruit' : hit.className || hit.tagName) : 'none';
        })`,
      )
      check(
        '(D1 regression) elementFromPoint at fruit centers resolves into each fruit',
        overlays.every((entry) => entry === 'fruit'),
        overlays.join(','),
      )
      // (a) all five fruits collect via REAL coordinate taps.
      for (let tap = 0; tap < 5; tap += 1) {
        await tapCenter(cdp, '.count-fruit:not(.count-fruit--collected)')
        await sleep(350)
      }
      const collected = await evalJs(
        cdp,
        `document.querySelectorAll('.count-fruit--collected').length`,
      )
      check('(a) all 5 fruits collect via real coordinate taps', collected === 5, `collected=${collected}`)
    } else {
      // Big props/actors: the contract is a tappable PAINTED region (a
      // toddler taps the visible art, not a geometric center). Scan the
      // target's rect for a point that hit-tests into the target itself.
      const point = await waitForEval(
        cdp,
        `(() => {
          const el = document.querySelector('.target-glow');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const steps = 6;
          for (let iy = 0; iy <= steps; iy += 1) {
            for (let ix = 0; ix <= steps; ix += 1) {
              const x = r.x + (r.width * ix) / steps;
              const y = r.y + (r.height * iy) / steps;
              const hit = document.elementFromPoint(x, y);
              if (hit && hit.closest('[data-target]') === el) return { x, y };
            }
          }
          return null;
        })()`,
        8000,
        'a tappable painted point on the interaction target',
      )
      check(
        `(b0) scene ${scene + 1} target has a tappable painted region`,
        typeof point?.x === 'number',
        point ? `point=${Math.round(point.x)},${Math.round(point.y)}` : 'none found',
      )
      await tapAt(cdp, point.x, point.y)
      await sleep(300)
    }
    // (b) interaction completes -> next button appears -> advance.
    const nextVisible = await waitForEval(
      cdp,
      `(() => {
        const b = document.querySelector('.next-btn');
        return b && !b.classList.contains('hidden') && b.getBoundingClientRect().width > 0;
      })()`,
      8000,
      'next button after interaction',
    )
    check(
      `(b) scene ${scene + 1} interaction completes (next button visible)`,
      nextVisible === true,
    )
    if (scene < 8) {
      await tapCenter(cdp, '.next-btn')
      // Gate on the flip fully settling: exactly one .page (old page removed)
      // and the progress dot on the expected scene, so no tap races the
      // 700ms page-flip overlap window (two .page nodes coexist mid-flip).
      await waitForEval(
        cdp,
        `document.querySelectorAll('.page').length === 1 &&
         [...document.querySelectorAll('.progress-dots .dot')].findIndex((d) => d.classList.contains('dot--active')) === ${scene + 1}`,
        4000,
        `flip to scene ${scene + 2}`,
      )
      const idx = await activeSceneIndex(cdp)
      check(`scene ${scene + 1} -> ${scene + 2} flip`, idx === scene + 1, `activeDot=${idx}`)
    } else {
      // Final scene: "Lanjut" finishes the story -> celebration -> Hikmah.
      await tapCenter(cdp, '.next-btn')
    }
  }

  // Celebration (~2.6s) -> Hikmah screen.
  const hikmah = await waitForEval(
    cdp,
    `(() => {
      const el = document.querySelector('.hikmah-screen');
      return el ? document.querySelector('.hikmah-sentence')?.textContent : null;
    })()`,
    12000,
    'hikmah screen after celebration',
  )
  check('(c) Hikmah screen renders after the celebration', typeof hikmah === 'string' && hikmah.length > 0, String(hikmah))

  // Album sticker granted.
  const sticker = await evalJs(cdp, `JSON.parse(localStorage.getItem('kisahq.album') || '{}')`)
  check('album sticker granted for berbagi-rambutan', sticker['berbagi-rambutan'] === true)

  // (e) E2: page errors were previously only surfaced on timeout — an
  // error-free run is now an explicit assertion of its own.
  check(
    'no uncaught page errors during the whole run',
    pageErrors.length === 0,
    pageErrors.length ? `${pageErrors.length} collected: ${pageErrors.slice(0, 3).join(' | ')}` : '',
  )
} catch (error) {
  failures.push(`probe crashed: ${error.message}`)
  console.error(`  FAIL probe crashed: ${error.message}`)
} finally {
  chrome.kill()
  rmSync(profile, { recursive: true, force: true })
  server.close()
}

console.log('')
if (failures.length > 0) {
  console.error(`verify:browser FAILED — ${failures.length} failure(s)`)
  process.exit(1)
}
console.log(`verify:browser PASSED — ${passes.length} check(s) green at ${VIEWPORT.width}x${VIEWPORT.height}`)
