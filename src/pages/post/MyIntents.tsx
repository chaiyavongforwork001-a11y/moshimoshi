import { AnimatePresence, motion } from 'motion/react'
import { Clock3, Pencil, X } from 'lucide-react'
import { Link } from 'react-router'
import { IconButton } from '@/components/ui'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { ReactedBadge } from '@/pages/rooms/bits'
import { TEMPLATE_BY_KEY, whenText } from './templates'

export const MAX_ACTIVE = 3

/** My active โพสต์หาเพื่อน (max 3): tap one to edit it, or take it down. */
export function MyIntents({ editingId }: { editingId?: string }) {
  const myIntents = useMoshi((s) => s.myIntents)
  const removeIntent = useMoshi((s) => s.removeIntent)
  if (!myIntents.length) return null

  return (
    <section aria-labelledby="my-intents" className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="my-intents" className="font-display text-base font-semibold">
          {t('โพสต์หาเพื่อนของเรา', 'Your posts')}
        </h2>
        <span className="flex items-center gap-1" aria-label={t(`ใช้ไป ${myIntents.length} จาก ${MAX_ACTIVE} ใบ`, `${myIntents.length} of ${MAX_ACTIVE} posts used`)}>
          {Array.from({ length: MAX_ACTIVE }, (_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className={`h-2 rounded-full ${i < myIntents.length ? 'bg-coral' : 'bg-ink/10'}`}
              animate={{ width: i < myIntents.length ? 18 : 8 }}
              transition={spring.bouncy}
            />
          ))}
        </span>
      </div>
      <ul className="grid gap-2 md:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {myIntents.map((i) => {
            const tpl = TEMPLATE_BY_KEY[i.template]
            const p = MOCHI[tpl?.color ?? 'cream']
            return (
              <motion.li
                key={i.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
                transition={spring.soft}
                className={`flex items-center gap-2 rounded-2xl border-2 p-2 pl-2.5 shadow-[var(--shadow-soft)] ${
                  editingId === i.id ? 'border-lavender bg-lavender/20' : 'border-white/80 bg-white/80'
                }`}
              >
                {tpl && (
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-ink" style={{ background: p.base }} aria-hidden>
                    <tpl.Icon size={17} strokeWidth={2.4} />
                  </span>
                )}
                <Link
                  to={`/app/post?edit=${i.id}`}
                  aria-label={t(`แก้ไขโพสต์ "${i.text}"`, `Edit post "${i.text}"`)}
                  className="min-w-0 flex-1 rounded-xl outline-offset-2"
                >
                  <span className="block truncate text-sm font-semibold">{i.text}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    <Clock3 size={12} aria-hidden /> {whenText(i.when, i.whenLabel)}
                  </span>
                  <ReactedBadge kind="metoo" ids={i.joinedBy} className="mt-1.5" />
                </Link>
                <Link
                  to={`/app/post?edit=${i.id}`}
                  aria-hidden
                  tabIndex={-1}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/5"
                >
                  <Pencil size={17} />
                </Link>
                <IconButton label={t(`ลบโพสต์ "${i.text}"`, `Delete post "${i.text}"`)} variant="ghost" onClick={() => removeIntent(i.id)}>
                  <X size={18} />
                </IconButton>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </section>
  )
}
