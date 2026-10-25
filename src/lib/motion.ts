import type { Transition, Variants } from 'motion/react'

// Shared motion tokens — use these instead of ad-hoc numbers.
export const spring = {
  /** default UI spring: cards, sheets, page content */
  soft: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 } satisfies Transition,
  /** playful pop: chips, badges, likes */
  bouncy: { type: 'spring', stiffness: 520, damping: 17, mass: 0.7 } satisfies Transition,
  /** slow drift: hero copy, big reveals */
  gentle: { type: 'spring', stiffness: 120, damping: 20, mass: 1 } satisfies Transition,
}

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  squish: [0.34, 1.56, 0.64, 1] as const,
}

/** squishy press feedback for any tappable surface */
export const press = {
  whileHover: { y: -2, scale: 1.02 },
  whileTap: { scale: 0.94, y: 1 },
  transition: spring.bouncy,
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: spring.soft },
}

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: spring.bouncy },
}

export const stagger = (gap = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

// enter ends on `filter: none`: any filter value (even blur(0px)) would make the
// page wrapper the containing block for position: fixed children.
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(4px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...spring.soft, filter: { duration: 0.25 } },
    transitionEnd: { filter: 'none' },
  },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.16, ease: ease.out } },
}
