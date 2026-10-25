import { AnimatePresence, motion, type Variants } from 'motion/react'
import { ArrowRight, ChevronLeft, MoonStar, PartyPopper } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { MochiExpression } from '@/components/three'
import { Avatar, IconButton } from '@/components/ui'
import { useDataMode, useDataReady, useRooms } from '@/data/hooks'
import { useIsDesktop } from '@/lib/hooks'
import { ease, spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import type { User } from '@/lib/types'
import {
  ageState,
  autoBio,
  birthPatch,
  buildIntent,
  cleanPrompts,
  defaultRooms,
  initialDraft,
  lookPatch,
  validate,
  type Draft,
  type DraftPatch,
  type StepCheck,
} from './model'
import { LAST_STEP, mascotLine, mascotReaction, STEPS } from './options'
import { useDebounced, useFlash } from './parts/hooks'
import { MascotSays } from './parts/MascotSays'
import { PreviewPanel } from './parts/PreviewPanel'
import { StepActions } from './parts/StepActions'
import { StepProgress } from './parts/StepProgress'
import { StepDone } from './steps/StepDone'
import { StepHello } from './steps/StepHello'
import { StepInterests } from './steps/StepInterests'
import { StepLooking } from './steps/StepLooking'
import { StepMochi } from './steps/StepMochi'
import { StepRooms } from './steps/StepRooms'
import { StepStory } from './steps/StepStory'

const ROOMS_STEP = 5

// direction-aware slide; children using `fadeUp` stagger in after it
const slide: Variants = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 56 }),
  show: { opacity: 1, x: 0, transition: { ...spring.soft, staggerChildren: 0.055, delayChildren: 0.05 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -56, transition: { duration: 0.18, ease: ease.out } }),
}

/** Live mode waits for the profile, so the draft starts from the real one. */
export default function OnboardingPage() {
  const ready = useDataReady()
  if (!ready) {
    return (
      <div className="relative z-10 flex min-h-dvh items-center justify-center" role="status" aria-label="กำลังโหลด">
        <span className="size-12 rounded-full bg-peach shadow-[var(--shadow-puffy)] motion-safe:animate-bounce" />
      </div>
    )
  }
  return <Onboarding />
}

function Onboarding() {
  const me = useMoshi((s) => s.me)
  const onboarded = useMoshi((s) => s.onboarded)
  const completeOnboarding = useMoshi((s) => s.completeOnboarding)
  const updateMe = useMoshi((s) => s.updateMe)
  const postIntent = useMoshi((s) => s.postIntent)
  const removeIntent = useMoshi((s) => s.removeIntent)
  const rooms = useRooms()
  const mode = useDataMode()
  const desktop = useIsDesktop()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft>(() => initialDraft(me, onboarded))
  const [firstTime] = useState(!onboarded)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [navigated, setNavigated] = useState(false)
  const [nudge, setNudge] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [lookChanged, setLookChanged] = useState(false)
  const [flashExpr, flash] = useFlash<MochiExpression>()
  const postedIntent = useRef<string | null>(null)

  const update = useCallback((patch: DraftPatch) => {
    setDraft((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }))
  }, [])

  // the mochi reacts: a happy boing when its look changes, chatter while you type its name
  const prev = useRef(draft)
  useEffect(() => {
    const was = prev.current
    prev.current = draft
    if (was.color !== draft.color || was.accessory !== draft.accessory || was.face !== draft.face) {
      setPulse((n) => n + 1)
      setLookChanged(true)
      if (was.face === draft.face) flash('happy', 1100)
    }
    if (was.name !== draft.name && draft.name.trim()) flash('talk', 380)
  }, [draft, flash])

  const nameOk = draft.name.trim().length > 0
  const expression: MochiExpression = step === LAST_STEP ? 'happy' : (flashExpr ?? (step === 0 && nameOk ? 'happy' : draft.face))

  const settledName = useDebounced(draft.name, 700)
  const settledStory = useDebounced(draft.prompts[0]?.text ?? '', 900)
  const line = mascotLine(step, draft)
  const reaction = mascotReaction(step, draft, { settledName, settledStory, lookChanged })
  // a server with no rooms yet must not trap anyone on the rooms step
  const check: StepCheck = step === ROOMS_STEP && !rooms.length ? { ok: true } : validate(step, draft)

  // live: skipping ahead is only offered once the 20+ check has passed (and it saves what we know)
  const age = ageState(draft)
  const verified = age.kind === 'skip' || age.kind === 'ok'
  const canSkip = mode === 'demo' ? age.kind !== 'under' : onboarded || (verified && nameOk)
  const skip = () => {
    if (mode === 'live' && !onboarded) updateMe({ name: draft.name.trim(), ...birthPatch(draft) })
  }

  const goTo = (to: number) => {
    setDir(to > step ? 1 : -1)
    setNudge(0)
    setNavigated(true)
    setStep(to)
    if (to === LAST_STEP) setPulse((n) => n + 1) // one more sparkle pop to celebrate
  }

  const commit = () => {
    const patch: Partial<User> = {
      ...lookPatch(draft),
      ...birthPatch(draft),
      name: draft.name.trim(),
      color: draft.color,
      tags: draft.tags,
      loves: draft.loves,
      prompts: cleanPrompts(draft),
      online: draft.online,
      chatStyle: draft.chatStyle,
      rooms: draft.rooms,
      ...(firstTime ? { bio: autoBio(draft) } : {}),
    }
    completeOnboarding(patch)
    // re-committing (e.g. after going back) replaces the intent instead of stacking another
    if (postedIntent.current) removeIntent(postedIntent.current)
    postedIntent.current = null
    const intent = buildIntent(draft, me.province, rooms)
    if (intent) postedIntent.current = postIntent(intent).id
  }

  const next = () => {
    if (!check.ok) {
      setNudge((n) => n + 1)
      return
    }
    if (step === LAST_STEP) {
      navigate('/app')
      return
    }
    if (step === ROOMS_STEP - 1 && !draft.roomsTouched) update((d) => ({ rooms: defaultRooms(d, rooms) }))
    if (step === ROOMS_STEP) commit()
    goTo(step + 1)
  }

  const back = () => (step === 0 ? navigate(onboarded ? '/app' : '/') : goTo(step - 1))

  // Enter = next, except on buttons/links (they activate themselves) and mid-IME composition
  const nextRef = useRef(next)
  useEffect(() => {
    nextRef.current = next
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || e.repeat || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.closest('button, a, select, [role="button"], [role="dialog"]')) return
      e.preventDefault()
      nextRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const nothingYet = !draft.intent && !draft.online.length && !draft.chatStyle.length
  const cta = step === LAST_STEP ? 'ไปคืนนี้กันเลย' : step === ROOMS_STEP ? 'เสร็จแล้ว!' : step === 4 && nothingYet ? 'ไว้ค่อยบอกทีหลัง' : 'ไปต่อ'
  const ctaIcon = step === LAST_STEP ? <MoonStar size={20} aria-hidden /> : step === ROOMS_STEP ? <PartyPopper size={20} aria-hidden /> : <ArrowRight size={20} aria-hidden />

  const stepProps = { draft, update, desktop }
  const stepBody = (() => {
    switch (step) {
      case 0:
        return <StepHello {...stepProps} expression={expression} pulse={pulse} />
      case 1:
        return <StepMochi {...stepProps} expression={expression} pulse={pulse} />
      case 2:
        return <StepInterests {...stepProps} />
      case 3:
        return <StepStory {...stepProps} />
      case 4:
        return <StepLooking {...stepProps} />
      case ROOMS_STEP:
        return <StepRooms {...stepProps} />
      default:
        return <StepDone desktop={desktop} pulse={pulse} onOpenProfile={(id) => navigate(`/app/people/${id}`)} />
    }
  })()

  const stepView = (
    <AnimatePresence mode="wait" custom={dir} onExitComplete={() => window.scrollTo({ top: 0 })}>
      <motion.div key={step} custom={dir} variants={slide} initial="hidden" animate="show" exit="exit" className="space-y-6">
        <MascotSays line={line.line} sub={line.sub} face={line.face} reaction={reaction} focusOnMount={navigated} listening={step !== LAST_STEP} />
        {stepBody}
      </motion.div>
    </AnimatePresence>
  )

  const actions = (variant: 'bar' | 'row') => (
    <StepActions variant={variant} label={cta} icon={ctaIcon} ok={check.ok} need={check.need} nudge={nudge} onNext={next} />
  )

  return (
    // overflow-x-clip: the sideways step slide must never cause horizontal scroll (clip keeps sticky working)
    <div className="relative z-10 min-h-dvh overflow-x-clip">
      <Header step={step} desktop={desktop} onBack={back} canSkip={canSkip} onSkip={skip} />
      {desktop ? (
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-8 px-8 pt-2 pb-12 xl:gap-12">
          <aside className="sticky top-[6.75rem]" aria-label="ตัวอย่างโปรไฟล์">
            <PreviewPanel draft={draft} expression={expression} pulse={pulse} step={step} province={me.province} />
          </aside>
          <main className="min-w-0">
            <div className="glass rounded-[2.25rem] p-7 xl:p-9">{stepView}</div>
            {actions('row')}
          </main>
        </div>
      ) : (
        <>
          <main className="mx-auto max-w-xl px-4 pt-2 pb-44 sm:px-6">{stepView}</main>
          {actions('bar')}
        </>
      )}
    </div>
  )
}

interface HeaderProps {
  step: number
  desktop: boolean
  onBack: () => void
  canSkip: boolean
  onSkip: () => void
}

function Header({ step, desktop, onBack, canSkip, onSkip }: HeaderProps) {
  const done = step === LAST_STEP
  const label = STEPS[step].label
  return (
    <header className="safe-top sticky top-0 z-40 bg-cream/75 backdrop-blur-xl lg:bg-cream/40">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-3 sm:px-6 lg:gap-6 lg:px-8 lg:pt-3">
        {desktop && (
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-full pr-2 font-display text-xl font-semibold text-ink" aria-label="moshimoshi หน้าแรก">
            <Avatar color="cream" size={38} face="happy" />
            moshimoshi
          </Link>
        )}
        <IconButton label={step === 0 ? 'กลับหน้าก่อน' : 'ย้อนกลับ'} onClick={onBack} className={done ? 'invisible' : ''}>
          <ChevronLeft size={22} />
        </IconButton>

        <div className="min-w-0 flex-1 lg:mx-auto lg:max-w-lg">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={spring.soft}
                className="truncate text-ink"
              >
                {label}
              </motion.span>
            </AnimatePresence>
            <span className="shrink-0 text-ink-soft" aria-hidden>
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <StepProgress step={step} total={STEPS.length} label={label} />
        </div>

        {done || !canSkip ? (
          <span className="w-11 shrink-0 lg:w-24" aria-hidden />
        ) : (
          <Link
            to="/app"
            onClick={onSkip}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-white/70 hover:text-ink"
          >
            ข้ามไปก่อน
          </Link>
        )}
      </div>
    </header>
  )
}
