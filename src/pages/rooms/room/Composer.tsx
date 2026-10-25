import { AnimatePresence, motion } from 'motion/react'
import { SendHorizontal } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { IconButton } from '@/components/ui'
import { spring } from '@/lib/motion'

/**
 * Room chat composer, sticky at the bottom of the chat section: on phones it
 * rides just above the floating bottom nav, on desktop at the bottom of the
 * column. Being sticky (not fixed) it only shows while the chat is on screen,
 * so it never covers the room header or the tabs.
 */
export function Composer({
  roomName,
  onSend,
  suggestions = [],
  desktop,
}: {
  roomName: string
  onSend: (text: string) => void
  suggestions?: string[]
  desktop: boolean
}) {
  const id = useId()
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  const body = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: 0.15 }}
      className={
        desktop ? 'sticky bottom-5 z-20 mt-5' : 'sticky bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-30 mt-4'
      }
    >
      <div className="mx-auto max-w-md md:max-w-2xl">
        <AnimatePresence initial={false}>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              transition={spring.soft}
              className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3 pb-1 lg:mx-0 lg:px-0"
              aria-label="ข้อความทักทายแนะนำ"
              role="group"
            >
              {suggestions.map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  whileTap={{ scale: 0.92 }}
                  transition={spring.bouncy}
                  className="glass inline-flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap text-ink"
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <form
          onSubmit={submit}
          className="glass flex items-center gap-2 rounded-full p-1.5 pl-5 shadow-[var(--shadow-lift)] focus-within:ring-3 focus-within:ring-lavender"
        >
          <label htmlFor={id} className="sr-only">
            พิมพ์ข้อความถึงห้อง{roomName}
          </label>
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="พิมพ์ทักทายเพื่อนๆ ในห้อง…"
            autoComplete="off"
            enterKeyHint="send"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <IconButton label="ส่งข้อความ" type="submit" variant="primary" disabled={!text.trim()} className="disabled:opacity-50">
            <SendHorizontal size={20} strokeWidth={2.4} />
          </IconButton>
        </form>
      </div>
    </motion.div>
  )

  return body
}
