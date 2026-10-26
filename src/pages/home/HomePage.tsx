import { motion } from 'motion/react'
import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { InstallSheet } from '@/app/InstallSheet'
import { KineticText } from '@/components/motion'
import { Avatar, IconButton, PageHeader } from '@/components/ui'
import { useInstallPrompt } from '@/lib/hooks'
import { t } from '@/lib/i18n'
import { fadeUp, stagger } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { DailyQuestion } from './DailyQuestion'
import { greeting } from './greeting'
import { IntentMatches } from './IntentMatches'
import { MoodHero } from './MoodHero'
import { MyRooms } from './MyRooms'
import { OnboardBanner } from './OnboardBanner'
import { SessionsCarousel } from './SessionsCarousel'
import { TopMatches } from './TopMatches'

/** /app — "คืนนี้": a warm check-in, then what's happening tonight and who's on your wavelength. */
export default function HomePage() {
  const onboarded = useMoshi((s) => s.onboarded)
  const name = useMoshi((s) => s.me.name)
  const color = useMoshi((s) => s.me.color)
  const g = useMemo(() => greeting(), [])
  const install = useInstallPrompt()
  const [installOpen, setInstallOpen] = useState(false)
  // 'เรา' is the stored default display name (data, not UI text), so it stays Thai here
  const showName = onboarded && name && name !== 'เรา'

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex max-w-full items-center gap-2 align-bottom">
            <motion.span
              aria-hidden
              initial={{ rotate: -30, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-butter/70 lg:size-10"
            >
              <g.Icon size={20} strokeWidth={2.4} />
            </motion.span>
            <KineticText className="min-w-0 truncate" text={`${g.hello}${showName ? t(` ${name}`, `, ${name}`) : ''}`} />
          </span>
        }
        subtitle={g.sub}
        action={
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            {!install.installed && (
              <IconButton label={t('ติดตั้งแอปไว้บนหน้าจอโฮม', 'Add the app to your home screen')} onClick={() => setInstallOpen(true)}>
                <Download size={19} />
              </IconButton>
            )}
            {/* phones: the profile lives up here (the tab bar holds คลื่นเดียวกัน) */}
            <Link
              to="/app/me"
              aria-label={t('โปรไฟล์ของเรา', 'My profile')}
              className="inline-flex size-11 items-center justify-center rounded-full bg-white shadow-[var(--shadow-soft)] transition-transform active:scale-90"
            >
              <Avatar color={color} size={34} face="happy" />
            </Link>
          </div>
        }
      />

      <motion.div variants={stagger(0.08, 0.05)} initial="hidden" animate="show">
        {!onboarded && <OnboardBanner />}
        <motion.div variants={fadeUp}>
          <MoodHero />
        </motion.div>
      </motion.div>

      <div className="mt-8 flex flex-col gap-9">
        <SessionsCarousel />
        <TopMatches />
        <IntentMatches />
        <div className="grid gap-9 md:grid-cols-5 md:gap-5">
          <DailyQuestion className="md:col-span-3" />
          <MyRooms className="md:col-span-2" />
        </div>
      </div>

      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </>
  )
}
