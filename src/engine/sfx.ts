import type { Sfx } from '../story/types'

/**
 * WebAudio-synthesized sound effects — no external audio assets. Scene
 * stingers are gamelan/angklung-flavored plucks (paired slightly-detuned
 * tones with fast decay, pelog-ish intervals); the page turn is a filtered
 * noise whoosh. Created lazily on the first user gesture (autoplay policies).
 */

export type Pluck = 'pluck1' | 'pluck2' | 'pluck3'

let ctx: AudioContext | undefined

function audioContext(): AudioContext | undefined {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) ctx = new Ctor()
    }
    if (ctx?.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return undefined
  }
}

/** Gamelan-ish paired pluck: two detuned tones, exponential decay. */
function pluck(context: AudioContext, baseHz: number, when: number, dur = 0.9): void {
  for (const detune of [0, 1.5]) {
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = 'sine'
    osc.frequency.value = baseHz + detune
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(0.22, when + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(gain).connect(context.destination)
    osc.start(when)
    osc.stop(when + dur)
  }
}

/** Filtered-noise whoosh for the page turn. */
function whoosh(context: AudioContext, when: number): void {
  const seconds = 0.5
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(400, when)
  filter.frequency.exponentialRampToValueAtTime(1400, when + seconds * 0.6)
  filter.Q.value = 1.2
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.12, when)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds)
  source.connect(filter).connect(gain).connect(context.destination)
  source.start(when)
}

function pop(context: AudioContext, when: number): void {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, when)
  osc.frequency.exponentialRampToValueAtTime(220, when + 0.09)
  gain.gain.setValueAtTime(0.25, when)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12)
  osc.connect(gain).connect(context.destination)
  osc.start(when)
  osc.stop(when + 0.13)
}

function chime(context: AudioContext, when: number): void {
  pluck(context, 880, when, 1.2)
  pluck(context, 1174.7, when + 0.18, 1.2)
}

function shakeSfx(context: AudioContext, when: number): void {
  for (let i = 0; i < 3; i += 1) {
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140 + i * 12, when + i * 0.16)
    gain.gain.setValueAtTime(0.18, when + i * 0.16)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + i * 0.16 + 0.15)
    osc.connect(gain).connect(context.destination)
    osc.start(when + i * 0.16)
    osc.stop(when + i * 0.16 + 0.16)
  }
}

function sparkle(context: AudioContext, when: number): void {
  [1318.5, 1567.9, 2093].forEach((hz, i) => pluck(context, hz, when + i * 0.09, 0.7))
}

export function playSfx(name: Sfx | Pluck): void {
  const context = audioContext()
  if (!context) return
  const now = context.currentTime + 0.01
  switch (name) {
    case 'pop':
      pop(context, now)
      break
    case 'chime':
      chime(context, now)
      break
    case 'shake':
      shakeSfx(context, now)
      break
    case 'whoosh':
      whoosh(context, now)
      break
    case 'sparkle':
      sparkle(context, now)
      break
    case 'pluck1':
      pluck(context, 523.3, now)
      break
    case 'pluck2':
      pluck(context, 587.3, now)
      break
    case 'pluck3':
      pluck(context, 698.5, now)
      break
  }
}
