// Apps open links in their own built-in browser (LINE, Facebook, Messenger, Instagram, TikTok…),
// and Google refuses to sign anyone in there: it shows "403 disallowed_useragent" and stops.
// These helpers tell which app's browser this is, from the mark each app adds to the user
// agent, and the best way out of it for that app and phone.
// Google: developers.google.com/identity/protocols/oauth2/policies (use secure browsers)
// LINE: developers.line.biz/en/docs/line-login/using-line-url-scheme (openExternalBrowser=1)
// Chrome: developer.chrome.com/docs/android/intents (intent:// links)

export type InAppApp = 'line' | 'facebook' | 'messenger' | 'instagram' | 'threads' | 'tiktok' | 'x' | 'wechat' | 'snapchat' | 'linkedin' | 'other'
export type PhoneOs = 'ios' | 'android' | 'other'

export interface InAppBrowser {
  app: InAppApp
  /** the app's own name; null when we can't tell which app it is */
  name: string | null
  os: PhoneOs
  /** LINE's LIFF browser, where openExternalBrowser does nothing */
  liff: boolean
}

type Named = Exclude<InAppApp, 'other'>

// The mark each app adds to the user agent, checked in order (Messenger before Facebook: both carry FBAN / FB_IAB).
// LINE: "… Mobile/15E148 Safari Line/15.12.1" on iPhone, "… Line/15.12.1" on Android, plus " LIFF" inside LIFF apps.
// Meta: "[FBAN/FBIOS;FBAV/…]" on iPhone, "[FB_IAB/FB4A;FBAV/…]" on Android, "FBAN/MessengerForiOS" / "FB_IAB/Orca-Android" for Messenger.
// TikTok: "musical_ly_…" (or "trill_…", the Asia build used in Thailand), "BytedanceWebview/…", "ByteLocale/…".
const APPS: { app: Named; name: string; mark: RegExp }[] = [
  { app: 'line', name: 'LINE', mark: /\bLine\/\d/i },
  { app: 'messenger', name: 'Messenger', mark: /\bFB(AN|_IAB)\/(Messenger|Orca-Android)/i },
  { app: 'threads', name: 'Threads', mark: /\bBarcelona\b/ },
  { app: 'instagram', name: 'Instagram', mark: /\bInstagram\b/ },
  { app: 'facebook', name: 'Facebook', mark: /\bFB(AN|AV|_IAB)\// },
  { app: 'tiktok', name: 'TikTok', mark: /musical_ly|bytedance|\btrill_\d|\bbytelocale\//i },
  { app: 'x', name: 'X', mark: /\bTwitter/ },
  { app: 'wechat', name: 'WeChat', mark: /\bMicroMessenger\//i },
  { app: 'snapchat', name: 'Snapchat', mark: /\bSnapchat\b/i },
  { app: 'linkedin', name: 'LinkedIn', mark: /\bLinkedInApp\b/i },
]

const IOS = /\b(iPhone|iPad|iPod)\b/

function osOf(ua: string, touchPoints: number): PhoneOs {
  // iPadOS asks for desktop pages with a Mac user agent: only the touch screen gives it away
  if (IOS.test(ua) || (/\bMacintosh\b/.test(ua) && touchPoints > 1)) return 'ios'
  return /\bAndroid\b/.test(ua) ? 'android' : 'other'
}

/** Which app's built-in browser this user agent belongs to, or null for a real browser. */
export function detectInAppBrowser(ua: string, opts: { standalone?: boolean; touchPoints?: number } = {}): InAppBrowser | null {
  // our own installed app isn't anyone's in-app browser (on iPhone it also drops "Safari/" from the user agent)
  if (opts.standalone) return null
  const os = osOf(ua, opts.touchPoints ?? 0)
  const hit = APPS.find((a) => a.mark.test(ua))
  if (hit) return { app: hit.app, name: hit.name, os, liff: hit.app === 'line' && /\bLIFF\b/.test(ua) }
  // an app we can't name: Android's WebView says "; wv)", and a web view on iPhone leaves out Safari's "Safari/…"
  if ((os === 'android' && /\bwv\)/.test(ua)) || (IOS.test(ua) && !/\bSafari\//.test(ua))) return { app: 'other', name: null, os, liff: false }
  return null
}

/** This page's in-app browser, or null in a real browser. */
export function currentInAppBrowser(): InAppBrowser | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return devPreview() ?? detectInAppBrowser(navigator.userAgent, { standalone, touchPoints: navigator.maxTouchPoints })
}

// dev only: /login?inapp=line-ios (or facebook-android, tiktok-ios, other-android…) shows the card in any browser
function devPreview(): InAppBrowser | null {
  if (!import.meta.env.DEV) return null
  const [app = '', os = 'ios'] = (new URLSearchParams(window.location.search).get('inapp') ?? '').split('-')
  if (!app) return null
  const named = APPS.find((a) => a.app === app)
  return { app: named?.app ?? 'other', name: named?.name ?? null, os: os === 'android' || os === 'other' ? os : 'ios', liff: false }
}

/**
 * LINE opens any link carrying openExternalBrowser=1 in the phone's own browser. The Chrome
 * intent's fallback carries it too, so a page that comes back with it, still inside an app,
 * knows the jump didn't happen.
 */
export const OUTSIDE_MARK = 'openExternalBrowser'

export type WayOut =
  /** load it: LINE hands it to the phone's browser */
  | { kind: 'line'; href: string }
  /** Android: an intent:// link straight to Chrome */
  | { kind: 'chrome'; href: string }
  /** nothing on the page can do it (iPhone, TikTok, WeChat): only the app's own menu */
  | { kind: 'menu' }

/** The best one-tap way out of this in-app browser for `href`. */
export function wayOut(b: InAppBrowser, href: string): WayOut {
  // LINE's URL options work in its phone apps only (not LINE for PC, not LIFF apps)
  if (b.app === 'line' && !b.liff && b.os !== 'other') return { kind: 'line', href: withMark(href) }
  // TikTok and WeChat ignore intent:// links
  if (b.os === 'android' && b.app !== 'tiktok' && b.app !== 'wechat') {
    const intent = chromeIntent(href)
    if (intent) return { kind: 'chrome', href: intent }
  }
  return { kind: 'menu' }
}

/** intent://host/path?query#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=…;end */
export function chromeIntent(href: string): string | null {
  const clean = withoutMark(href)
  let u: URL
  try {
    u = new URL(clean)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  // no Chrome on this phone: the plain page loads instead, marked so it can say the jump didn't happen
  const fallback = encodeURIComponent(withMark(clean))
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.slice(0, -1)};package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}

function withMark(href: string): string {
  try {
    const u = new URL(href)
    u.searchParams.set(OUTSIDE_MARK, '1')
    return u.href
  } catch {
    return href
  }
}

/** The address without our mark: what gets copied and opened outside. */
export function withoutMark(href: string): string {
  try {
    const u = new URL(href)
    if (!u.searchParams.has(OUTSIDE_MARK)) return href
    u.searchParams.delete(OUTSIDE_MARK)
    return u.href
  } catch {
    return href
  }
}

/** Copies text. In-app browsers often block the Clipboard API, so this falls back to the old copy command; false when both fail. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      // some in-app browsers never answer: give up after a moment instead of leaving the tap hanging
      await Promise.race([navigator.clipboard.writeText(text), new Promise<never>((_, no) => window.setTimeout(no, 1500))])
      return true
    }
  } catch {
    // blocked: try the old way
  }
  return execCopy(text)
}

function execCopy(text: string): boolean {
  const selection = document.getSelection()
  if (!selection) return false
  // selectable but unseen; a span rather than a textarea, so no keyboard pops up on phones
  const span = document.createElement('span')
  span.textContent = text
  span.style.cssText = 'position:fixed;top:0;left:0;white-space:pre;opacity:0;user-select:text;-webkit-user-select:text'
  document.body.append(span)
  const range = document.createRange()
  range.selectNodeContents(span)
  selection.removeAllRanges()
  selection.addRange(range)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  selection.removeAllRanges()
  span.remove()
  return ok
}
