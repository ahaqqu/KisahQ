import { getLang, setLang, t } from '../i18n'
import { getProvider, PROVIDER_IDS } from '../audio/registry'
import {
  AUDIO_SETTINGS_KEYS,
  readSetting,
  writeSetting,
  type ProviderId,
} from '../audio/types'

/**
 * Parent gate — a long-press (2s) "Untuk Orang Tua" button guarding
 * settings/language/audio. The child can reach settings only through this
 * gate; keys entered here live ONLY in this browser's localStorage.
 */

const HOLD_MS = 2000

export interface ParentGateCallbacks {
  onLangChange: () => void
}

export function renderParentGateButton(container: HTMLElement, callbacks: ParentGateCallbacks): void {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'parent-gate'
  button.textContent = t('parentGate')
  button.setAttribute('aria-label', `${t('parentGate')} — ${t('parentGateHint')}`)

  const progress = document.createElement('span')
  progress.className = 'parent-gate__progress'
  button.appendChild(progress)

  let holdTimer = 0
  let startedAt = 0

  const resetHold = () => {
    window.clearTimeout(holdTimer)
    button.classList.remove('parent-gate--holding')
    progress.style.setProperty('--progress', '0%')
  }

  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startedAt = Date.now()
    button.classList.add('parent-gate--holding')
    const tick = () => {
      const ratio = Math.min(1, (Date.now() - startedAt) / HOLD_MS)
      progress.style.setProperty('--progress', `${Math.round(ratio * 100)}%`)
      if (ratio < 1) holdTimer = window.setTimeout(tick, 100)
    }
    tick()
    holdTimer = window.setTimeout(() => {
      resetHold()
      openParentMenu(callbacks)
    }, HOLD_MS)
  })
  for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
    button.addEventListener(type, resetHold)
  }
  button.addEventListener('click', (event) => {
    // A plain click (no hold) must not open the gate.
    if (Date.now() - startedAt < HOLD_MS) event.preventDefault()
  })
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Keyboard path: Enter-and-hold is impractical — use a 2s keydown repeat.
      if (startedAt === 0) {
        startedAt = Date.now()
        button.classList.add('parent-gate--holding')
        holdTimer = window.setTimeout(() => {
          resetHold()
          startedAt = 0
          openParentMenu(callbacks)
        }, HOLD_MS)
      }
      event.preventDefault()
    }
  })
  button.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (Date.now() - startedAt < HOLD_MS) {
        resetHold()
        startedAt = 0
      }
    }
  })
  container.appendChild(button)
}

function openParentMenu(callbacks: ParentGateCallbacks): void {
  const backdrop = document.createElement('div')
  backdrop.className = 'parent-backdrop'
  const dialog = document.createElement('div')
  dialog.className = 'parent-menu'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', t('parentMenuTitle'))
  renderMenuContent(dialog, callbacks, 'language')
  backdrop.appendChild(dialog)
  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close()
  })
  document.addEventListener('keydown', function onKey(event) {
    if (event.key === 'Escape') {
      close()
      document.removeEventListener('keydown', onKey)
    }
  })
  const closeButton = dialog.querySelector<HTMLButtonElement>('.parent-menu__close')
  closeButton?.focus()
}

type TabId = 'language' | 'sound' | 'about'

function renderMenuContent(dialog: HTMLElement, callbacks: ParentGateCallbacks, activeTab: TabId): void {
  dialog.innerHTML = ''

  const header = document.createElement('header')
  header.className = 'parent-menu__header'
  const title = document.createElement('h2')
  title.textContent = t('parentMenuTitle')
  header.appendChild(title)
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'parent-menu__close'
  close.textContent = t('close')
  close.addEventListener('click', () => close.closest('.parent-backdrop')?.remove())
  header.appendChild(close)
  dialog.appendChild(header)

  const tabs = document.createElement('nav')
  tabs.className = 'parent-menu__tabs'
  const tabDefs: Array<[TabId, string]> = [
    ['language', t('tabLanguage')],
    ['sound', t('tabSound')],
    ['about', t('tabAbout')],
  ]
  for (const [tabId, label] of tabDefs) {
    const tabButton = document.createElement('button')
    tabButton.type = 'button'
    tabButton.className = 'parent-menu__tab'
    tabButton.textContent = label
    tabButton.setAttribute('aria-pressed', String(tabId === activeTab))
    tabButton.addEventListener('click', () => renderMenuContent(dialog, callbacks, tabId))
    tabs.appendChild(tabButton)
  }
  dialog.appendChild(tabs)

  const body = document.createElement('div')
  body.className = 'parent-menu__body'
  if (activeTab === 'language') renderLanguageTab(body, callbacks)
  if (activeTab === 'sound') renderSoundTab(body)
  if (activeTab === 'about') renderAboutTab(body)
  dialog.appendChild(body)
}

function renderLanguageTab(body: HTMLElement, callbacks: ParentGateCallbacks): void {
  const label = document.createElement('p')
  label.textContent = t('languageLabel')
  body.appendChild(label)
  const row = document.createElement('div')
  row.className = 'parent-menu__lang-row'
  for (const lang of ['id', 'en'] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'parent-menu__lang'
    button.textContent = lang === 'id' ? 'Bahasa Indonesia' : 'English'
    button.setAttribute('aria-pressed', String(getLang() === lang))
    button.addEventListener('click', () => {
      setLang(lang)
      callbacks.onLangChange()
    })
    row.appendChild(button)
  }
  body.appendChild(row)
}

function renderSoundTab(body: HTMLElement): void {
  const providerLabel = document.createElement('label')
  providerLabel.textContent = t('soundProvider')
  providerLabel.htmlFor = 'kisahq-provider'
  body.appendChild(providerLabel)

  const select = document.createElement('select')
  select.id = 'kisahq-provider'
  select.className = 'parent-menu__select'
  const current = (readSetting(AUDIO_SETTINGS_KEYS.provider) || 'browser') as ProviderId
  for (const id of PROVIDER_IDS) {
    const option = document.createElement('option')
    option.value = id
    option.textContent = getProvider(id).label[getLang()]
    option.selected = id === current
    select.appendChild(option)
  }
  body.appendChild(select)

  const keyWrap = document.createElement('div')
  keyWrap.className = 'parent-menu__keys'
  renderKeyField(keyWrap, 'google', AUDIO_SETTINGS_KEYS.googleKey, AUDIO_SETTINGS_KEYS.googleVoice)
  renderKeyField(keyWrap, 'elevenlabs', AUDIO_SETTINGS_KEYS.elevenlabsKey, AUDIO_SETTINGS_KEYS.elevenlabsVoice)
  body.appendChild(keyWrap)

  const note = document.createElement('p')
  note.className = 'parent-menu__note'
  note.textContent = t('soundNote')
  body.appendChild(note)

  select.addEventListener('change', () => {
    writeSetting(AUDIO_SETTINGS_KEYS.provider, select.value)
  })
}

function renderKeyField(
  container: HTMLElement,
  provider: 'google' | 'elevenlabs',
  keySetting: string,
  voiceSetting: string,
): void {
  const fieldset = document.createElement('fieldset')
  fieldset.className = 'parent-menu__key-field'
  const legend = document.createElement('legend')
  legend.textContent = getProvider(provider).label[getLang()]
  fieldset.appendChild(legend)

  const keyInput = document.createElement('input')
  keyInput.type = 'password'
  keyInput.className = 'parent-menu__input'
  keyInput.placeholder = t('apiKeyLabel')
  keyInput.value = readSetting(keySetting)
  keyInput.autocomplete = 'off'
  keyInput.setAttribute('aria-label', `${legend.textContent} — ${t('apiKeyLabel')}`)
  keyInput.addEventListener('change', () => writeSetting(keySetting, keyInput.value.trim()))
  fieldset.appendChild(keyInput)

  const voiceInput = document.createElement('input')
  voiceInput.type = 'text'
  voiceInput.className = 'parent-menu__input'
  voiceInput.placeholder = t('voiceIdLabel')
  voiceInput.value = readSetting(voiceSetting)
  voiceInput.autocomplete = 'off'
  voiceInput.setAttribute('aria-label', `${legend.textContent} — ${t('voiceIdLabel')}`)
  voiceInput.addEventListener('change', () => writeSetting(voiceSetting, voiceInput.value.trim()))
  fieldset.appendChild(voiceInput)

  container.appendChild(fieldset)
}

function renderAboutTab(body: HTMLElement): void {
  const text = document.createElement('p')
  text.textContent = t('aboutText')
  body.appendChild(text)
}
