import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { knownEnglish } from './known'

/*
 * Thai / English. The app is written Thai-first; English sits next to it in
 * the same file (t('ไทย', 'English')), so there are no keys to keep in sync.
 *
 * Switching remounts the whole route tree (see Root in app/router), so plain
 * t() calls during render always read the current language. Only code that
 * renders outside the router needs the useLang() hook.
 *
 * What people write (names, bios, posts, messages) is never translated.
 */

export type Lang = 'th' | 'en'

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>()(
  persist((set) => ({ lang: 'th', setLang: (lang) => set({ lang }) }), {
    name: 'moshi-lang',
    partialize: (s) => ({ lang: s.lang }),
  }),
)

export const useLang = () => useLangStore((s) => s.lang)
export const getLang = (): Lang => useLangStore.getState().lang
export const setLang = (lang: Lang) => useLangStore.getState().setLang(lang)

/** The current language's text. */
export const t = (th: string, en: string): string => (getLang() === 'en' ? en : th)

/** Text in both languages, for data declared outside components. Read it with tx() (or a template literal). */
export class Txt {
  constructor(
    readonly th: string,
    readonly en: string,
  ) {}
  toString() {
    return tx(this)
  }
}

export const L = (th: string, en: string) => new Txt(th, en)

export const tx = (v: string | Txt): string => (typeof v === 'string' ? v : getLang() === 'en' ? v.en : v.th)

/** A record whose values read in the current language, e.g. `texts({ game: L('เกม', 'Games') }).game`. */
export function texts<K extends string>(map: Record<K, Txt>): Readonly<Record<K, string>> {
  const out = {} as Record<K, string>
  for (const k of Object.keys(map) as K[]) Object.defineProperty(out, k, { get: () => tx(map[k]), enumerable: true })
  return out
}

type Localizable<T> = { [K in keyof T]: T[K] extends string | undefined ? T[K] | Txt : T[K] }

/**
 * An object whose Txt fields read in the current language, so module-level
 * data keeps its plain shape: `loc<Tag>({ id: 'cat', label: L('ทาสแมว', 'Cat person') })`.
 * Never copy a field out at module load (spread, Object.fromEntries): the copy keeps one language.
 */
export function loc<T extends object>(o: Localizable<T>): T {
  const out = {} as T
  for (const [k, v] of Object.entries(o)) {
    if (v instanceof Txt) Object.defineProperty(out, k, { get: () => tx(v), enumerable: true })
    else (out as Record<string, unknown>)[k] = v
  }
  return out
}

/**
 * English for Thai values that are stored as data rather than written by
 * people: provinces, chat styles, languages, seeded room sessions and daily
 * questions, time labels ("15 นาทีที่แล้ว", "คืนนี้ 21:00"). Unknown text passes through unchanged.
 */
export function known(value: string): string
export function known(value: string | undefined): string | undefined
export function known(value: string | undefined): string | undefined {
  if (!value || getLang() === 'th') return value
  return knownEnglish(value) ?? value
}

/** Locale for Intl / toLocale*String. */
export const dateLocale = () => (getLang() === 'en' ? 'en-GB' : 'th-TH')

const TITLE = L('moshimoshi — หาเพื่อนจากเรื่องที่ชอบ', 'moshimoshi — find friends through what you love')

/** The default tab title in the current language (pages that set their own put this back on the way out). */
export const appTitle = () => tx(TITLE)

const PLACEHOLDER_NAMES: Record<string, string> = { เรา: 'Me', เพื่อนใหม่: 'New friend' }

/** A name for display: only the app's placeholder names get English, people's own names never change. */
export const displayName = (name: string) => (getLang() === 'en' && Object.hasOwn(PLACEHOLDER_NAMES, name) ? PLACEHOLDER_NAMES[name] : name)

function applyToDocument(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  document.title = appTitle()
}

applyToDocument(getLang())
useLangStore.subscribe((s, prev) => {
  if (s.lang !== prev.lang) applyToDocument(s.lang)
})
