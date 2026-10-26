import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Avatar, ButtonLink } from '@/components/ui'
import { t } from '@/lib/i18n'
import { fadeUp } from '@/lib/motion'

/** Shown until onboarding is done: a friendly nudge, never a wall. */
export function OnboardBanner() {
  return (
    <motion.aside
      variants={fadeUp}
      aria-label={t('ทำความรู้จักกันก่อน', "Let's get to know you")}
      className="relative mb-4 flex flex-col gap-3 overflow-hidden rounded-[2rem] border border-white/80 bg-linear-to-br from-butter/60 via-cream-2 to-pink/40 p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-white/40 blur-2xl" />
      <div className="flex items-center gap-3 sm:flex-1">
        <Avatar color="butter" size={54} face="wink" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug font-semibold">{t('ยังไม่ได้รู้จักกันเลยนะ', "We haven't met properly yet")}</p>
          <p className="text-sm text-ink-soft">
            {t(
              'บอกโมชิหน่อยว่าชอบอะไร จะได้ชวนเพื่อนที่คลื่นตรงกันมาให้ ใช้เวลาไม่ถึงนาที',
              "Tell Mochi what you're into, so it can bring you people on your wavelength. Takes under a minute",
            )}
          </p>
        </div>
      </div>
      <ButtonLink to="/onboarding" size="md" iconRight={<ArrowRight size={18} />} className="w-full sm:w-auto">
        {t('เริ่มทำความรู้จัก', "Let's get started")}
      </ButtonLink>
    </motion.aside>
  )
}
