import { createContext, useContext } from 'react'

const KEY = 'moshi-intro-seen'

/** The preloader plays once per browser session, never with reduced motion. */
export function shouldPlayIntro() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return false
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // private mode: the intro may simply play again next time
  }
}

/** false while the preloader still covers the page; hero reveals wait for it. */
export const IntroContext = createContext(true)
export const useIntroReady = () => useContext(IntroContext)
