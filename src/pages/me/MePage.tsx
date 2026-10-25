import { Pencil } from 'lucide-react'
import { useCallback, useState } from 'react'
import { KineticText, Reveal } from '@/components/motion'
import { IconButton, PageHeader } from '@/components/ui'
import { useDataMode, useDataReady } from '@/data/hooks'
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
  if (!ready) return <PageSkeleton label="กำลังโหลดโปรไฟล์ของเรา…" />
  return (
    <div>
      <PageHeader
        title={<KineticText text="โปรไฟล์ของเรา" />}
        subtitle="เพื่อนๆ จะเห็นหน้าของเราแบบนี้"
        action={
          <IconButton label="แก้ไขโปรไฟล์" onClick={() => setEdit('basics')}>
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
