import { Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { KineticText, Reveal } from '@/components/motion'
import { IconButton, PageHeader } from '@/components/ui'
import { useDataMode, useDataReady } from '@/data/hooks'
import { t } from '@/lib/i18n'
import { PageSkeleton } from '@/pages/people/Skeleton'
import { Account } from './Account'
import { EditSheets, type EditKind } from './EditSheets'
import { MeHero } from './MeHero'
import { MyIntents, MyPrompts, MyRooms, MyTags } from './MySections'
import { Settings } from './Settings'

export default function MePage() {
  const [edit, setEdit] = useState<EditKind | null>(null)
  const closeEdit = useCallback(() => setEdit(null), [])
  const live = useDataMode() === 'live'
  const ready = useDataReady()
  if (!ready) return <PageSkeleton label={t('กำลังโหลดโปรไฟล์ของเรา…', 'Loading your profile…')} />
  return (
    <div>
      <PageHeader
        title={<KineticText text={t('โปรไฟล์ของเรา', 'My profile')} />}
        subtitle={t('เพื่อนๆ จะเห็นหน้าของเราแบบนี้', 'This is how friends see you')}
        action={
          <IconButton label={t('แก้ไขโปรไฟล์', 'Edit profile')} onClick={() => setEdit('basics')}>
            <Pencil size={18} />
          </IconButton>
        }
      />
      <MeHero onEdit={() => setEdit('basics')} onEditStyle={() => setEdit('style')} />
      <Reveal>
        <MyTags onEdit={() => setEdit('tags')} />
      </Reveal>
      <Reveal>
        <MyPrompts />
      </Reveal>
      <Reveal>
        <MyIntents />
      </Reveal>
      <Reveal>
        <MyRooms />
      </Reveal>
      <Reveal>
        <Settings />
      </Reveal>
      {live && (
        <Reveal>
          <Account />
        </Reveal>
      )}
      <EditSheets open={edit} onClose={closeEdit} />
    </div>
  )
}
