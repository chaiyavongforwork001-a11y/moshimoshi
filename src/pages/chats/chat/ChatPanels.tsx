import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, ChevronLeft, Clock3, ImagePlus, Lightbulb, Lock, MessageCircleHeart, MessageCircleOff, Pin, Radio, Send, ShieldCheck, Shuffle } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, ButtonLink, SignalMeter } from '@/components/ui'
import { t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import type { SignalLevel, User } from '@/lib/types'
import { statusLabel } from '@/pages/people/lib'

export function ChatHeader({
  them,
  level,
  typing,
  waiting,
  incoming = false,
}: {
  them: User
  level: SignalLevel
  typing: boolean
  waiting: boolean
  /** they said hi and we haven't answered yet */
  incoming?: boolean
}) {
  const status = typing ? t('กำลังพิมพ์…', 'Typing…') : waiting ? t('รอเขาตอบรับคำทัก…', 'Waiting for them to accept…') : incoming ? t('ทักแชทมาหาเรา', 'Said hi to you') : statusLabel(them)
  return (
    <header className="safe-top sticky top-0 z-30 flex items-center gap-2 border-b border-line/70 bg-cream/80 px-3 pb-2.5 backdrop-blur-xl lg:static lg:rounded-t-[2rem] lg:bg-white/70 lg:px-5 lg:pt-4 lg:pb-3">
      <Link
        to="/app/chats"
        aria-label={t('กลับไปหน้าแชท', 'Back to chats')}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-soft)] transition-transform active:scale-90"
      >
        <ChevronLeft size={22} />
      </Link>
      <Link to={`/app/people/${them.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 pr-2 hover:bg-white/60">
        <Avatar color={them.color} size={42} online={them.isOnline} face={typing ? 'talk' : 'smile'} />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-lg leading-tight font-semibold">{them.name}</span>
            <SignalMeter level={level} size="xs" short />
          </span>
          <span className="block" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="block truncate text-xs text-ink-soft"
              >
                {status}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </Link>
    </header>
  )
}

export interface Topic {
  tip: string
  text: string
}

/** Pinned topic card: tap "ใช้หัวข้อนี้" to drop a ready opener into the composer. */
export function IcebreakerCard({ topics, onUse }: { topics: Topic[]; onUse: (text: string) => void }) {
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(true)
  const id = useId()
  if (!topics.length) return null
  const topic = topics[i % topics.length]
  return (
    <motion.section
      layout
      transition={spring.soft}
      aria-labelledby={`${id}-h`}
      className="relative overflow-hidden rounded-3xl border border-butter/70 bg-butter/25 p-3.5 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-butter shadow-[inset_0_-2px_0_rgb(59_38_34/0.12)]">
          <Lightbulb size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${id}-h`} className="flex items-center gap-1 text-xs font-semibold text-ink-soft">
              <Pin size={12} aria-hidden /> {t('หัวข้อชวนคุย', 'Conversation starters')}
            </h2>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? t('ย่อหัวข้อชวนคุย', 'Collapse conversation starters') : t('ขยายหัวข้อชวนคุย', 'Expand conversation starters')}
              className="-my-2 -mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink"
            >
              <motion.span animate={{ rotate: open ? 0 : -90 }} transition={spring.bouncy} className="inline-flex">
                <ChevronDown size={18} />
              </motion.span>
            </button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={topic.tip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`text-[15px] leading-relaxed text-ink ${open ? '' : 'line-clamp-1'}`}
            >
              {topic.tip}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring.soft}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2.5">
                  <Button size="sm" variant="secondary" onClick={() => onUse(topic.text)}>
                    {t('ใช้หัวข้อนี้', 'Use this one')}
                  </Button>
                  {topics.length > 1 && (
                    <Button size="sm" variant="ghost" icon={<Shuffle size={15} aria-hidden />} onClick={() => setI((n) => n + 1)}>
                      {t('หัวข้ออื่น', 'Another one')}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}

/**
 * บันไดความไว้ใจ — step 2 (photos) needs both people to switch it on. Each side controls only
 * their own switch; either one turning it off locks new photos again. Links and LINE ids can't be
 * locked in plain text, so for those the card just asks to agree first.
 */
export function TrustLadder({
  name,
  consent,
  onToggle,
}: {
  name: string
  consent: { me: boolean; them: boolean }
  onToggle: (on: boolean) => void
}) {
  const id = useId()
  const both = consent.me && consent.them
  // read out as the switch's description: its name stays the same whatever the state
  const status = both
    ? t('ปลดล็อกแล้ว! ส่งรูปหากันได้เลย', 'Unlocked! You can send each other photos')
    : consent.me
      ? t(`เรากดยินยอมแล้ว รอ${name}กดด้วยนะ`, `You've agreed. Waiting for ${name}`)
      : consent.them
        ? t(`${name}กดยินยอมแล้ว ถ้าเราโอเคก็เปิดได้เลย`, `${name} agreed. Switch it on if you're okay too`)
        : t('ยังไม่มีใครกดยินยอม', 'Neither of you has agreed yet')
  return (
    <section aria-labelledby={`${id}-h`} className={`rounded-3xl border p-3.5 shadow-[var(--shadow-soft)] sm:p-4 ${both ? 'border-mint bg-mint/20' : 'border-line bg-white/85'}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mint/60">
          <ShieldCheck size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-xs font-semibold text-ink-soft">
            {t('บันไดความไว้ใจ', 'Trust ladder')}
          </h2>
          <p className="text-sm leading-relaxed text-ink">
            <b className="font-display font-semibold">{t('ขั้น 1: คุยกันได้แล้ว', 'Step 1: You can chat')}</b> ·{' '}
            {t('ขั้น 2: ส่งรูปได้เมื่อทั้งคู่กดยินยอม', 'Step 2: photos unlock once you both agree')}
          </p>
        </div>
      </div>

      {/* the ladder: chat → photos, filled halfway per yes */}
      <ol className="mt-3 flex items-center gap-2 px-1" aria-label={t('ขั้นของบันไดความไว้ใจ', 'Trust ladder steps')}>
        <li className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-mint">
            <Check size={13} strokeWidth={3} aria-hidden />
          </span>
          {t('คุยกันได้', 'Chat')}
        </li>
        <li aria-hidden className="relative h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-ink/10">
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-mint to-butter"
            animate={{ width: both ? '100%' : consent.me || consent.them ? '50%' : '0%' }}
            transition={spring.soft}
          />
        </li>
        <li className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold ${both ? 'text-ink' : 'text-ink-soft'}`}>
          <span className={`flex size-6 items-center justify-center rounded-full ${both ? 'bg-butter' : 'bg-ink/10'}`}>
            {both ? <ImagePlus size={12} strokeWidth={2.6} aria-hidden /> : <Lock size={12} strokeWidth={2.6} aria-hidden />}
          </span>
          {t('ส่งรูป', 'Photos')}
        </li>
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-1.5">
        <span className="min-w-0">
          <label id={`${id}-label`} htmlFor={`${id}-switch`} className="block cursor-pointer text-sm font-semibold text-ink">
            {t('เรายินยอมให้ส่งรูปหากัน', "I'm okay with sending photos")}
          </label>
          {/* live: their yes (or no) is read out too */}
          <span id={`${id}-status`} aria-live="polite" className="block text-xs text-ink-soft">
            {status}
          </span>
        </span>
        <button
          id={`${id}-switch`}
          type="button"
          role="switch"
          aria-checked={consent.me}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-status`}
          onClick={() => onToggle(!consent.me)}
          className="relative inline-flex h-11 w-14 shrink-0 items-center justify-center"
        >
          {/* off is a solid track (about 4.3:1 on cream, knob 4.6:1), not a faint pill */}
          <span className={`relative h-7 w-12 rounded-full transition-colors ${consent.me ? 'bg-success' : 'bg-ink-faint'}`}>
            <motion.span
              className="absolute top-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(59_38_34/0.25)]"
              animate={{ left: consent.me ? 22 : 2 }}
              transition={spring.bouncy}
            />
          </span>
        </button>
      </div>

      {/* who said yes so far */}
      <ul className="mt-2 flex flex-wrap gap-1.5 px-1 text-xs" aria-label={t('ใครกดยินยอมแล้วบ้าง', 'Who has agreed')}>
        {[
          { key: 'me', who: t('เรา', 'You'), on: consent.me },
          { key: 'them', who: name, on: consent.them },
        ].map((p) => (
          <li
            key={p.key}
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${p.on ? 'bg-mint/60 text-ink' : 'bg-ink/5 text-ink-soft'}`}
          >
            {p.on ? <Check size={12} strokeWidth={3} aria-hidden /> : <Clock3 size={12} strokeWidth={2.6} aria-hidden />}
            <span className="min-w-0 truncate">{p.who}</span>
            <span className="sr-only">{p.on ? t('ยินยอมแล้ว', 'agreed') : t('ยังไม่ได้กด', 'not yet')}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-xs text-ink-soft">
        {t(
          'เปลี่ยนใจได้ทุกเมื่อ ใครปิดก็ล็อกทันที · จะแลกลิงก์หรือไลน์ ตกลงกันก่อนนะ',
          'Change your mind anytime: either switch off locks photos again · Agree before swapping links or LINE too',
        )}
      </p>
    </section>
  )
}

/** Our hello is out and waiting for their answer. */
export function HelloSentBanner({ them }: { them: User }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={spring.soft}
      className="flex items-center gap-3 rounded-3xl bg-peach/45 p-3"
      role="status"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-coral/40" aria-hidden />
        <span className="relative flex size-11 animate-wiggle items-center justify-center rounded-full bg-coral text-ink shadow-[var(--shadow-puffy)]">
          <Send size={19} aria-hidden />
        </span>
      </span>
      <p className="min-w-0 text-sm leading-relaxed">
        <b className="font-display font-semibold">{t(`รอ${them.name}ตอบรับคำทักอยู่`, `Waiting for ${them.name} to accept your hello`)}</b>
        <br />
        <span className="text-ink-soft">{t('ส่งข้อความทักไปแล้ว ถ้าเขาตอบรับจะบอกทันทีนะ', "Your hello is sent! We'll tell you the moment they accept")}</span>
      </p>
    </motion.div>
  )
}

/**
 * Stands in for the composer while our hello waits for an answer: nobody can be
 * messaged first, so only the hello goes out until they accept.
 */
export function WaitingNote({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      className="safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-2.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4"
    >
      <div className="flex items-center gap-3 rounded-[1.4rem] border border-line bg-white/80 px-3.5 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-peach/60" aria-hidden>
          <Send size={17} />
        </span>
        <p className="min-w-0 text-sm leading-relaxed">
          <b className="font-display font-semibold text-ink">{t(`รอ${name}ตอบรับก่อนนะ แล้วค่อยแชทกันต่อ`, `Wait for ${name} to accept, then keep chatting`)}</b>
          <br />
          <span className="text-ink-soft">{t('ส่งได้แค่ข้อความทักแรก ให้เขาได้เลือกเองว่าจะคุยด้วยไหม', 'Only your hello goes out for now, so they get to choose whether to chat')}</span>
        </p>
      </div>
    </motion.div>
  )
}

/** They said hi: their hello is in the list below; we decide whether to accept. */
export function IncomingBanner({ them }: { them: User }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={spring.soft}
      className="flex items-center gap-3 rounded-3xl bg-mint/40 p-3"
      role="status"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-mint" aria-hidden />
        <span className="relative flex size-11 animate-wiggle items-center justify-center rounded-full bg-mint text-ink shadow-[var(--shadow-puffy)]">
          <MessageCircleHeart size={20} aria-hidden />
        </span>
      </span>
      <p className="min-w-0 text-sm leading-relaxed">
        <b className="font-display font-semibold">{t(`${them.name}ทักแชทมาหาเรา`, `${them.name} said hi to you`)}</b>
        <br />
        <span className="text-ink-soft">
          {t(
            'อ่านข้อความทักของเขาด้านล่างได้เลย อยากคุยด้วยก็กดตอบรับ ไม่สะดวกก็ไว้ก่อนได้',
            'Their hello is just below. Want to chat? Accept. Not a good time? Maybe later is fine',
          )}
        </span>
      </p>
    </motion.div>
  )
}

const dock =
  'safe-bottom sticky bottom-0 z-30 border-t border-line/70 bg-cream/85 px-3 pt-2.5 backdrop-blur-xl lg:static lg:rounded-b-[2rem] lg:bg-white/70 lg:px-5 lg:pb-4'

/** Stands in for the composer on a hello someone sent us: ตอบรับ / ไว้ก่อน. */
export function IncomingActions({ name, onAccept, onDecline }: { name: string; onAccept: () => void; onDecline: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className={dock}>
      <div className="rounded-[1.4rem] border border-line bg-white/80 p-3">
        <p className="text-sm leading-relaxed text-ink">
          <b className="font-display font-semibold">{t(`คุยกับ${name}ไหม?`, `Chat with ${name}?`)}</b>{' '}
          <span className="text-ink-soft">
            {t(
              'ตอบรับแล้วแชทกันต่อได้เลย ถ้ากดไว้ก่อน ไม่มีใครเห็นคำว่าปฏิเสธนะ',
              'Accept and start chatting. Tap Maybe later and nobody ever sees the word "declined"',
            )}
          </span>
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
          <Button block icon={<MessageCircleHeart size={18} aria-hidden />} onClick={onAccept}>
            {t('ตอบรับ แชทกันเลย', 'Accept & chat')}
          </Button>
          <Button variant="ghost" block icon={<Clock3 size={18} aria-hidden />} onClick={onDecline}>
            {t('ไว้ก่อน', 'Maybe later')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/** The chat is closed (ended, or the hello was never accepted): no composer, a gentle way onward. */
export function EndedNote({ name }: { name: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className={dock}>
      <div className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-line bg-white/80 px-3.5 py-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-3" aria-hidden>
          <MessageCircleOff size={18} />
        </span>
        <p className="min-w-0 flex-[1_1_12rem] text-sm leading-relaxed">
          <b className="font-display font-semibold text-ink">{t(`แชทกับ${name}ปิดไปแล้ว`, `Your chat with ${name} has closed`)}</b>
          <br />
          <span className="text-ink-soft">{t('ไม่เป็นไรเลยนะ ยังมีคนคลื่นเดียวกันรอคุยอยู่อีกเยอะ', "That's totally okay. Lots more people on your wavelength are waiting to chat")}</span>
        </p>
        <ButtonLink to="/app/people" variant="soft" size="sm" icon={<Radio size={15} aria-hidden />}>
          {t('หาคนคลื่นเดียวกัน', 'Find people on your wavelength')}
        </ButtonLink>
      </div>
    </motion.div>
  )
}
