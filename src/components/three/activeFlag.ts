/*
 * Whether a View3D box is on (or near) the screen. Kept free of three/R3F
 * imports so the DOM side (View3D) can create it; see viewActive.ts.
 */
export interface ActiveFlag {
  readonly current: boolean
  subscribe: (cb: () => void) => () => void
}

export interface MutableActiveFlag extends ActiveFlag {
  set: (v: boolean) => void
}

export function createActiveFlag(initial = false, parent?: ActiveFlag): MutableActiveFlag {
  const subs = new Set<() => void>()
  let own = initial
  const notify = () => subs.forEach((cb) => cb())
  return {
    get current() {
      return own && (parent ? parent.current : true)
    },
    set(v: boolean) {
      if (v === own) return
      own = v
      notify()
    },
    subscribe(cb) {
      subs.add(cb)
      const off = parent?.subscribe(cb)
      return () => {
        subs.delete(cb)
        off?.()
      }
    },
  }
}
