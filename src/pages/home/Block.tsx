import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { Zone, zoneAction } from '@/components/ui/Zone'
import { spring } from '@/lib/motion'
import type { MochiColor } from '@/lib/types'

/** Home section: one framed zone (title band + content), softly revealed when it scrolls into view. */
export function Block({
  id,
  title,
  icon,
  note,
  action,
  tone,
  children,
  className = '',
}: {
  id: string
  title: ReactNode
  icon?: ReactNode
  note?: ReactNode
  action?: ReactNode
  tone?: MochiColor
  children: ReactNode
  className?: string
}) {
  return (
    <Reveal margin="0px 0px -60px 0px" className={className}>
      <Zone id={id} title={title} icon={icon} note={note} action={action} tone={tone} className="h-full">
        {children}
      </Zone>
    </Reveal>
  )
}

/** Number that rolls up/down when it changes (counts, RSVPs). */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-70%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '70%', opacity: 0 }}
          transition={spring.bouncy}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** "See all" link in a zone's title band (its words hide on narrow phones, the icon stays). */
export const seeAllClass = zoneAction
