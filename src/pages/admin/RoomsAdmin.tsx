// /admin/rooms: staff create, edit and delete rooms (public.rooms; policies in
// supabase/migrations/20261110000001_room_admin_photos_open_age.sql). Photo rights and hosts are set
// inside each room, on its members tab.
import { ArrowLeft, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button, PageHeader, RoomIcon, Sheet } from '@/components/ui'
import { t } from '@/lib/i18n'
import { db } from '@/lib/supabase'
import type { MochiColor, Room } from '@/lib/types'
import { AdminRoomPerms } from '@/pages/rooms/room/roomPhotos'

interface RoomRow {
  id: string
  name: string
  icon: string
  color: MochiColor
  tagline: string
  vibe: string
  tags: string[]
  prime_time: string
  is_lobby: boolean
  sort: number
}

const ICONS = ['Sofa', 'Coffee', 'Gamepad2', 'Music', 'Languages', 'HeartHandshake', 'Building2', 'Sparkles']
const COLORS: MochiColor[] = ['peach', 'butter', 'mint', 'lavender', 'sky', 'pink', 'cream']
const BLANK: RoomRow = { id: '', name: '', icon: 'Sofa', color: 'peach', tagline: '', vibe: '', tags: [], prime_time: '', is_lobby: false, sort: 0 }

const asRoom = (r: RoomRow) => ({ ...r, memberCount: 0, onlineCount: 0, primeTime: r.prime_time, hostIds: [] }) as Room
const field = 'w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-ink'

export function RoomsConsole() {
  const [rooms, setRooms] = useState<RoomRow[] | null>(null)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<{ row: RoomRow; isNew: boolean } | null>(null)
  const [permsFor, setPermsFor] = useState<RoomRow | null>(null)

  const load = useCallback(() => {
    setError(false)
    void db()
      .from('rooms')
      .select('*')
      .order('sort')
      .order('name')
      .then(({ data, error: e }) => {
        if (e) setError(true)
        else setRooms((data ?? []) as unknown as RoomRow[])
      })
  }, [])
  useEffect(load, [load])

  return (
    <main className="relative z-10 mx-auto min-h-dvh max-w-4xl px-4 pb-16 lg:px-8">
      <PageHeader
        title={t('จัดการห้อง', 'Rooms')}
        subtitle={t('สร้าง แก้ไข และลบห้อง · สิทธิ์ส่งรูปตั้งในแท็บสมาชิกของแต่ละห้อง', "Create, edit and delete rooms · photo rights are set on each room's members tab")}
        action={
          <div className="flex items-center gap-2">
            <Link to="/admin" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-[var(--shadow-soft)]">
              <ArrowLeft size={16} aria-hidden />
              {t('รายงาน', 'Reports')}
            </Link>
            <Button size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => setEditing({ row: { ...BLANK, sort: (rooms?.length ?? 0) + 1 }, isNew: true })}>
              {t('สร้างห้อง', 'New room')}
            </Button>
          </div>
        }
      />
      {error && (
        <div role="alert" className="card mt-4 flex flex-wrap items-center gap-3 p-4">
          <span className="flex-1 text-ink">{t('โหลดรายชื่อห้องไม่สำเร็จ', "Couldn't load the rooms")}</span>
          <Button size="sm" variant="secondary" onClick={load}>
            {t('ลองใหม่', 'Retry')}
          </Button>
        </div>
      )}
      {!rooms && !error && <p className="mt-6 text-ink-soft">{t('กำลังโหลด…', 'Loading…')}</p>}
      <ul className="mt-4 space-y-3">
        {rooms?.map((r) => (
          <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
            <RoomIcon room={asRoom(r)} size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold text-ink">
                {r.name} {r.is_lobby && <span className="ml-1 rounded-full bg-butter/70 px-2 py-px text-xs">{t('ห้องหลัก', 'Lobby')}</span>}
              </p>
              <p className="truncate text-sm text-ink-soft">
                {r.id} · {r.tagline || t('(ยังไม่มีคำโปรย)', '(no tagline)')}
              </p>
            </div>
            <Link to={`/app/rooms/${r.id}`} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink underline underline-offset-4">
              {t('เปิดห้อง', 'Open')}
            </Link>
            <Button size="sm" variant="secondary" icon={<ImagePlus size={15} aria-hidden />} onClick={() => setPermsFor(r)}>
              {t('สิทธิ์ส่งรูป', 'Photo rights')}
            </Button>
            <Button size="sm" variant="secondary" icon={<Pencil size={15} aria-hidden />} onClick={() => setEditing({ row: { ...r }, isNew: false })}>
              {t('แก้ไข', 'Edit')}
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">{t('ห้องที่สร้างหรือแก้ไขจะขึ้นให้ทุกคนเห็นเมื่อเปิดแอปใหม่', 'People see new or edited rooms the next time they open the app')}</p>
      <Sheet open={!!permsFor} onClose={() => setPermsFor(null)} title={permsFor ? t(`สิทธิ์ใน${permsFor.name}`, `Rights in ${permsFor.name}`) : ''} width={560}>
        {permsFor && <AdminRoomPerms roomId={permsFor.id} />}
      </Sheet>
      <RoomSheet
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    </main>
  )
}

function RoomSheet({ editing, onClose, onSaved }: { editing: { row: RoomRow; isNew: boolean } | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={!!editing} onClose={onClose} title={editing?.isNew ? t('สร้างห้องใหม่', 'New room') : t('แก้ไขห้อง', 'Edit room')} width={560}>
      {editing && <RoomForm key={editing.row.id || 'new'} initial={editing.row} isNew={editing.isNew} onSaved={onSaved} />}
    </Sheet>
  )
}

function RoomForm({ initial, isNew, onSaved }: { initial: RoomRow; isNew: boolean; onSaved: () => void }) {
  const [r, setR] = useState(initial)
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const up = (patch: Partial<RoomRow>) => setR((x) => ({ ...x, ...patch }))
  const idOk = /^[a-z0-9-]{1,40}$/.test(r.id)

  const save = async () => {
    if (!r.name.trim()) return setProblem(t('ใส่ชื่อห้องก่อนนะ', 'Add a room name first'))
    if (isNew && !idOk) return setProblem(t('รหัสห้องใช้ได้แค่ a-z 0-9 และ - (ไม่เกิน 40 ตัว)', 'Room id: a-z, 0-9 and - only (up to 40)'))
    setBusy(true)
    setProblem(null)
    const row = {
      name: r.name.trim().slice(0, 60),
      icon: r.icon,
      color: r.color,
      tagline: r.tagline.trim(),
      vibe: r.vibe.trim(),
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
      prime_time: r.prime_time.trim(),
      sort: Number(r.sort) || 0,
    }
    const res = isNew ? await db().from('rooms').insert({ id: r.id, ...row } as never) : await db().from('rooms').update(row as never).eq('id', r.id)
    setBusy(false)
    if (res.error) {
      console.warn('[moshi] save room', res.error)
      setProblem(res.error.code === '23505' ? t('มีห้องที่ใช้รหัสนี้แล้ว', 'A room with this id already exists') : t('บันทึกไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't save. Try again"))
    } else onSaved()
  }

  const remove = async () => {
    setBusy(true)
    setProblem(null)
    const res = await db().from('rooms').delete().eq('id', r.id)
    setBusy(false)
    if (res.error) {
      console.warn('[moshi] delete room', res.error)
      setProblem(t('ลบไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't delete. Try again"))
    } else onSaved()
  }

  const label = 'mb-1 block text-sm font-semibold text-ink'
  return (
    <div className="space-y-3">
      {isNew && (
        <label className="block">
          <span className={label}>{t('รหัสห้อง (ใช้ในลิงก์ เปลี่ยนทีหลังไม่ได้)', "Room id (used in links, can't change later)")}</span>
          <input className={field} value={r.id} placeholder="anime-night" onChange={(e) => up({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) })} />
        </label>
      )}
      <label className="block">
        <span className={label}>{t('ชื่อห้อง', 'Name')}</span>
        <input className={field} value={r.name} maxLength={60} onChange={(e) => up({ name: e.target.value })} />
      </label>
      <label className="block">
        <span className={label}>{t('คำโปรยสั้นๆ', 'Tagline')}</span>
        <input className={field} value={r.tagline} maxLength={120} onChange={(e) => up({ tagline: e.target.value })} />
      </label>
      <label className="block">
        <span className={label}>{t('บรรยากาศห้อง', 'About the room')}</span>
        <textarea className={`${field} min-h-24`} value={r.vibe} maxLength={600} onChange={(e) => up({ vibe: e.target.value })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>{t('ไอคอน', 'Icon')}</span>
          <select className={field} value={r.icon} onChange={(e) => up({ icon: e.target.value })}>
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>{t('สี', 'Colour')}</span>
          <select className={field} value={r.color} onChange={(e) => up({ color: e.target.value as MochiColor })}>
            {COLORS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={label}>{t('แท็กเรื่องที่ชอบ (คั่นด้วย ,)', 'Interest tags (comma separated)')}</span>
        <input className={field} value={tags} placeholder="anime, manga" onChange={(e) => setTags(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>{t('ช่วงเวลาคึกคัก', 'Busy hours')}</span>
          <input className={field} value={r.prime_time} placeholder="20:00–23:00" onChange={(e) => up({ prime_time: e.target.value })} />
        </label>
        <label className="block">
          <span className={label}>{t('ลำดับ', 'Order')}</span>
          <input className={field} type="number" value={r.sort} onChange={(e) => up({ sort: Number(e.target.value) })} />
        </label>
      </div>
      {problem && (
        <p role="alert" className="rounded-2xl bg-butter/45 px-4 py-2 text-sm text-ink">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button onClick={() => void save()} disabled={busy}>
          {isNew ? t('สร้างห้อง', 'Create room') : t('บันทึก', 'Save')}
        </Button>
        {!isNew && !r.is_lobby && (
          <Button variant={confirmDelete ? 'primary' : 'ghost'} icon={<Trash2 size={15} aria-hidden />} disabled={busy} onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}>
            {confirmDelete ? t('ยืนยันลบห้องและข้อความทั้งหมด', 'Delete the room and all its messages') : t('ลบห้อง', 'Delete room')}
          </Button>
        )}
      </div>
      {!isNew && r.is_lobby && <p className="text-xs text-ink-soft">{t('ห้องหลักลบไม่ได้ เพราะคนใหม่ทุกคนเข้ามาที่นี่', "The lobby can't be deleted: every newcomer lands here")}</p>}
    </div>
  )
}
