import { useEffect, useState, useSyncExternalStore } from 'react'

// one stable subscribe function per query, so useSyncExternalStore doesn't
// re-attach the matchMedia listener on every render
const subscribers = new Map<string, (cb: () => void) => () => void>()
function subscribeMedia(query: string) {
  let sub = subscribers.get(query)
  if (!sub) {
    sub = (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    }
    subscribers.set(query, sub)
  }
  return sub
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** ≥1024px: sidebar layout. Below: mobile app layout with bottom tabs. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsWide = () => useMediaQuery('(min-width: 1280px)')
export const useIsStandalone = () => useMediaQuery('(display-mode: standalone)')
export const useCoarsePointer = () => useMediaQuery('(pointer: coarse)')

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

/**
 * PWA install helper.
 * canPrompt: Chrome/Edge/Android gave us an install prompt.
 * isIOS: Safari needs the manual "Share → Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  const standalone = useIsStandalone()
  // iPadOS 13+ Safari reports a desktop "Macintosh" UA; touch points give it away
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return {
    canPrompt: !!deferred,
    isIOS,
    installed: standalone,
    async prompt() {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      force((n) => n + 1)
      return outcome === 'accepted'
    },
  }
}
