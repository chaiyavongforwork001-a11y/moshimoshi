import { motion } from 'motion/react'
import { MapPin, MessagesSquare, Pencil } from 'lucide-react'
import { Button, Chip } from '@/components/ui'
import { MochiStage, View3D } from '@/components/three'
import { displayName, known, t } from '@/lib/i18n'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { COLOR_NAME } from '@/pages/people/lib'
import { ColorSwatches } from './ColorSwatches'

/** My profile card: my own 3D mochi (tap to squish, swatches recolour it live). */
export function MeHero({ onEdit, onEditStyle }: { onEdit: () => void; onEditStyle: () => void }) {
  const me = useMoshi((s) => s.me)
  const updateMe = useMoshi((s) => s.updateMe)
  return (
    <section aria-label={t('โปรไฟล์ของเรา', 'My profile')} className="relative grid items-center gap-3 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
      <div className="relative flex flex-col items-center">
        <View3D
          className="h-60 w-full sm:h-64"
          cursor={t('ลากเล่นได้', 'Drag to play')}
          label={t(`น้องโมชิสี${COLOR_NAME[me.color]}ของเรา แตะเพื่อบีบเล่นได้`, `My ${COLOR_NAME[me.color].toLowerCase()} Mochi. Tap to give it a squish`)}
        >
          <MochiStage color={me.color} expression="happy" accessory={me.accessory ?? 'none'} />
        </View3D>
        <div className="glass -mt-3 rounded-full px-2 py-0.5">
          <ColorSwatches value={me.color} onChange={(color) => updateMe({ color })} legend={t('เปลี่ยนสีโมชิ', "Change Mochi's color")} size={26} />
        </div>
      </div>

      <div className="min-w-0">
        <motion.h2 key={me.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="font-display text-3xl font-semibold">
          {displayName(me.name)}
        </motion.h2>
        <p className="flex items-center gap-1 text-sm text-ink-soft">
          <MapPin size={14} aria-hidden /> {known(me.province)}
        </p>
        <div className="relative mt-3 rounded-3xl bg-white p-4 shadow-[var(--shadow-soft)]">
          <span aria-hidden className="absolute -top-2 left-8 size-5 rotate-45 rounded-sm bg-white" />
          <p className="relative text-xs font-semibold text-ink-soft">{t('แนะนำตัว', 'About me')}</p>
          <p className="relative mt-0.5 text-[17px] text-ink">{me.bio || t('ยังไม่ได้เขียนแนะนำตัว แตะแก้ไขเพื่อเล่าเรื่องของเราสั้นๆ', 'No intro yet. Tap edit to share a little about yourself')}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <MessagesSquare size={15} aria-hidden /> {t('สไตล์การคุย', 'Chat style')}
          </span>
          {me.chatStyle.map((s) => (
            <Chip key={s} size="sm" color={me.color}>
              {known(s)}
            </Chip>
          ))}
          <button type="button" onClick={onEditStyle} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-ink underline-offset-4 hover:underline">
            {me.chatStyle.length ? t('แก้', 'Edit') : t('เลือกสไตล์', 'Pick a style')}
          </button>
        </div>
        <Button variant="secondary" icon={<Pencil size={16} aria-hidden />} onClick={onEdit} className="mt-3">
          {t('แก้ไขชื่อ แนะนำตัว และสี', 'Edit name, intro and color')}
        </Button>
      </div>
    </section>
  )
}
