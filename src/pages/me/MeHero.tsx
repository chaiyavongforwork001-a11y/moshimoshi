import { motion } from 'motion/react'
import { MapPin, MessagesSquare, Pencil } from 'lucide-react'
import { Button, Chip } from '@/components/ui'
import { MochiStage, View3D } from '@/components/three'
import { spring } from '@/lib/motion'
import { useMoshi } from '@/lib/store'
import { COLOR_NAME } from '@/pages/people/lib'
import { ColorSwatches } from './ColorSwatches'

/** My profile card: my own 3D mochi (tap to squish, swatches recolour it live). */
export function MeHero({ onEdit, onEditStyle }: { onEdit: () => void; onEditStyle: () => void }) {
  const me = useMoshi((s) => s.me)
  const updateMe = useMoshi((s) => s.updateMe)
  return (
    <section aria-label="โปรไฟล์ของเรา" className="relative grid items-center gap-3 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
      <div className="relative flex flex-col items-center">
        <View3D className="h-60 w-full sm:h-64" cursor="ลากเล่นได้" label={`น้องโมชิสี${COLOR_NAME[me.color]}ของเรา แตะเพื่อบีบเล่นได้`}>
          <MochiStage color={me.color} expression="happy" accessory={me.accessory ?? 'none'} />
        </View3D>
        <div className="glass -mt-3 rounded-full px-2 py-0.5">
          <ColorSwatches value={me.color} onChange={(color) => updateMe({ color })} legend="เปลี่ยนสีโมชิ" size={26} />
        </div>
      </div>

      <div className="min-w-0">
        <motion.h2 key={me.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="font-display text-3xl font-semibold">
          {me.name}
        </motion.h2>
        <p className="flex items-center gap-1 text-sm text-ink-soft">
          <MapPin size={14} aria-hidden /> {me.province}
        </p>
        <div className="relative mt-3 rounded-3xl bg-white p-4 shadow-[var(--shadow-soft)]">
          <span aria-hidden className="absolute -top-2 left-8 size-5 rotate-45 rounded-sm bg-white" />
          <p className="relative text-xs font-semibold text-ink-soft">แนะนำตัว</p>
          <p className="relative mt-0.5 text-[17px] text-ink">{me.bio || 'ยังไม่ได้เขียนแนะนำตัว แตะแก้ไขเพื่อเล่าเรื่องของเราสั้นๆ'}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <MessagesSquare size={15} aria-hidden /> สไตล์การคุย
          </span>
          {me.chatStyle.map((s) => (
            <Chip key={s} size="sm" color={me.color}>
              {s}
            </Chip>
          ))}
          <button type="button" onClick={onEditStyle} className="inline-flex h-11 items-center px-2 text-sm font-semibold text-ink underline-offset-4 hover:underline">
            {me.chatStyle.length ? 'แก้' : 'เลือกสไตล์'}
          </button>
        </div>
        <Button variant="secondary" icon={<Pencil size={16} aria-hidden />} onClick={onEdit} className="mt-3">
          แก้ไขชื่อ แนะนำตัว และสี
        </Button>
      </div>
    </section>
  )
}
