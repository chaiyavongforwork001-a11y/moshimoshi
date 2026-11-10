// Photos in rooms (live mode only): who may post them (room_members.can_post_images / host / staff),
// the composer's photo button, the photo bubble and a simple viewer.
// Server side: supabase/migrations/20261110000001_room_admin_photos_open_age.sql.
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, Button, Sheet } from '@/components/ui'
import { emitChange } from '@/data/live/bus'
import { ROOM_IMAGES, LINK_SECONDS, roomImagePath, rememberLocalImage, useChatImage } from '@/data/chatImages'
import type { RoomMessageRow } from '@/data/live/rows'
import { useAuth } from '@/lib/auth'
import { t } from '@/lib/i18n'
import { ImageError, prepareImage } from '@/lib/image'
import { db, isLive } from '@/lib/supabase'
import type { ChatMessage, User } from '@/lib/types'
import { ChatPhoto } from '@/pages/chats/chat/ImageSheets'

export interface MemberPerm {
  host: boolean
  images: boolean
}

/** Room roles and photo rights for this room, plus whether I'm staff. */
export function useRoomPerms(roomId: string) {
  const { userId } = useAuth()
  const [perms, setPerms] = useState<Map<string, MemberPerm>>(new Map())
  const [admin, setAdmin] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isLive || !userId) return
    let alive = true
    void db()
      .from('room_members')
      .select('user_id, role, can_post_images')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (!alive || !data) return
        const rows = data as unknown as { user_id: string; role: string; can_post_images?: boolean }[]
        setPerms(new Map(rows.map((r) => [r.user_id, { host: r.role === 'host', images: !!r.can_post_images }])))
      })
    return () => {
      alive = false
    }
  }, [roomId, userId, tick])

  useEffect(() => {
    if (!isLive || !userId) return
    let alive = true
    void db()
      .rpc('is_admin')
      .then(({ data }) => alive && setAdmin(data === true))
    return () => {
      alive = false
    }
  }, [userId])

  const mine = userId ? perms.get(userId) : undefined
  const canPost = !!mine && (mine.host || mine.images || admin)
  const canManage = admin || !!mine?.host

  /** switch photo rights (hosts and staff) or host (staff only) for one member */
  const set = useCallback(
    async (memberId: string, change: { images?: boolean; host?: boolean }) => {
      const { error } = await db().rpc('set_room_member_perms' as never, {
        p_room: roomId,
        p_user: memberId,
        p_images: change.images ?? null,
        p_host: change.host ?? null,
      } as never)
      if (error) throw error
      setTick((n) => n + 1)
    },
    [roomId],
  )

  return { perms, admin, canPost, canManage, set, reload: () => setTick((n) => n + 1) }
}

/** The composer's photo button: pick → shrink to JPEG → upload → post. */
export function PhotoButton({ roomId }: { roomId: string }) {
  const { userId } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const send = async (file: File) => {
    if (!userId) return
    setBusy(true)
    setProblem(null)
    try {
      const image = await prepareImage(file)
      const path = roomImagePath(roomId, image.width, image.height)
      const up = await db().storage.from(ROOM_IMAGES).upload(path, image.blob, { contentType: 'image/jpeg', upsert: false, cacheControl: String(LINK_SECONDS) })
      if (up.error) throw up.error
      rememberLocalImage(path, image.url)
      const res = await db()
        .from('room_messages')
        .insert({ room_id: roomId, user_id: userId, kind: 'image', body: path } as never)
        .select()
        .single()
      if (res.error) {
        void db().storage.from(ROOM_IMAGES).remove([path])
        throw res.error
      }
      emitChange({ table: 'room_messages', type: 'INSERT', row: res.data as unknown as RoomMessageRow })
    } catch (e) {
      console.warn('[moshi] room photo', e)
      setProblem(
        e instanceof ImageError
          ? e.problem === 'type'
            ? t('ไฟล์นี้ไม่ใช่รูปนะ', "That file isn't a photo")
            : e.problem === 'size'
              ? t('รูปใหญ่เกินไปนิด ลองรูปอื่นนะ', 'That photo is too big. Try another one')
              : t('เปิดรูปนี้ไม่ได้ ลองรูปอื่นนะ', "Couldn't open that photo. Try another one")
          : t('ส่งรูปไม่สำเร็จ ลองใหม่อีกทีนะ (ส่งได้ไม่เกิน 30 รูปต่อชั่วโมง)', "Couldn't send the photo. Try again (up to 30 photos an hour)"),
      )
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="relative shrink-0">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void send(f)
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={t('ส่งรูปในห้อง', 'Send a photo to the room')}
        title={t('ส่งรูปในห้อง', 'Send a photo to the room')}
        className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink shadow-[var(--shadow-soft)] hover:bg-cream disabled:opacity-60"
      >
        {busy ? <Loader2 size={18} aria-hidden className="motion-safe:animate-spin" /> : <ImagePlus size={18} aria-hidden />}
      </button>
      {problem && (
        <p role="alert" className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-white px-3 py-2 text-xs text-ink shadow-[var(--shadow-soft)]">
          {problem}
        </p>
      )}
    </div>
  )
}

/** A photo line in the room chat. */
export function RoomPhotoBubble({ message, mine, name, onOpen }: { message: ChatMessage; mine: boolean; name: string; onOpen: () => void }) {
  if (!message.image) return null
  return (
    <div className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
      {!mine && <span className="mb-1 px-1 text-xs font-semibold text-ink-soft">{name}</span>}
      <div className="w-[min(16rem,70vw)]">
        <ChatPhoto image={message.image} mine={mine} name={name} onOpen={onOpen} />
      </div>
      <span className="mt-0.5 px-1 text-[11px] text-ink-soft">{message.at}</span>
    </div>
  )
}

/** The photo, big. My own photo: delete it. Staff: take anyone's photo down. */
export function RoomPhotoViewer({
  message,
  name,
  mine,
  staff,
  onClose,
}: {
  message: ChatMessage | null
  name: string
  mine: boolean
  staff: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={!!message?.image} onClose={onClose} title={mine ? t('รูปที่เราส่ง', 'Your photo') : t(`รูปจาก${name}`, `Photo from ${name}`)} width={560}>
      {message?.image && <BigPhoto key={message.id} message={message} mine={mine} staff={staff} onClose={onClose} />}
    </Sheet>
  )
}

function BigPhoto({ message, mine, staff, onClose }: { message: ChatMessage; mine: boolean; staff: boolean; onClose: () => void }) {
  const { src, failed } = useChatImage(message.image)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(false)
  const path = message.image?.path

  const remove = async () => {
    setBusy(true)
    setProblem(false)
    try {
      if (mine) {
        const { data, error } = await db().from('room_messages').delete().eq('id', message.id).select('id, room_id')
        if (error || !data?.length) throw error ?? new Error('not deleted')
        emitChange({ table: 'room_messages', type: 'DELETE', row: data[0] as unknown as RoomMessageRow })
      } else {
        // staff: the line stays as a team notice (admin_delete_room_message)
        const { error } = await db().rpc('admin_delete_room_message', { p_message: message.id })
        if (error) throw error
        const row = await db().from('room_messages').select('*').eq('id', message.id).single()
        if (row.data) emitChange({ table: 'room_messages', type: 'UPDATE', row: row.data as unknown as RoomMessageRow })
      }
      // the file itself: best effort (the uploader and staff may remove it)
      if (path) void db().storage.from(ROOM_IMAGES).remove([path])
      onClose()
    } catch (e) {
      console.warn('[moshi] delete room photo', e)
      setProblem(true)
      setBusy(false)
    }
  }

  return (
    <div>
      {failed ? (
        <p className="py-8 text-center text-sm text-ink-soft">{t('เปิดรูปไม่สำเร็จ', "Couldn't open the photo")}</p>
      ) : !src ? (
        <p className="py-8 text-center text-sm text-ink-soft">{t('กำลังโหลดรูป…', 'Loading the photo…')}</p>
      ) : (
        <img src={src} alt="" className="mx-auto max-h-[65vh] w-auto rounded-2xl" />
      )}
      {(mine || staff) && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {problem && (
            <span role="alert" className="mr-auto text-sm text-ink">
              {t('ลบไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't delete. Try again")}
            </span>
          )}
          {confirm && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
          )}
          <Button
            variant={confirm ? 'primary' : 'secondary'}
            size="sm"
            icon={<Trash2 size={15} aria-hidden />}
            disabled={busy}
            onClick={() => (confirm ? void remove() : setConfirm(true))}
          >
            {confirm ? t('ยืนยันลบรูปนี้', 'Yes, delete this photo') : mine ? t('ลบรูปนี้', 'Delete this photo') : t('ลบรูป (ทีมงาน)', 'Remove photo (staff)')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** /admin/rooms: everyone in one room, with the same photo and host switches. */
export function AdminRoomPerms({ roomId }: { roomId: string }) {
  const perms = useRoomPerms(roomId)
  const [members, setMembers] = useState<User[] | null>(null)
  useEffect(() => {
    let alive = true
    void db()
      .from('room_members')
      .select('user_id, profiles(name, color)')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (!alive) return
        const rows = (data ?? []) as unknown as { user_id: string; profiles: { name: string; color: User['color'] } | null }[]
        setMembers(rows.map((r) => ({ id: r.user_id, name: r.profiles?.name || t('เพื่อนใหม่', 'New friend'), color: r.profiles?.color ?? 'cream' }) as User))
      })
    return () => {
      alive = false
    }
  }, [roomId])
  if (!members) return <p className="text-sm text-ink-soft">{t('กำลังโหลดสมาชิก…', 'Loading members…')}</p>
  return <RoomPermsPanel members={members} perms={perms} />
}

/** Hosts and staff: who in this room may post photos (and, staff only, who is a host). */
export function RoomPermsPanel({ members, perms }: { members: User[]; perms: ReturnType<typeof useRoomPerms> }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  if (!perms.canManage) return null
  const change = async (id: string, c: { images?: boolean; host?: boolean }) => {
    setBusy(id)
    setProblem(null)
    try {
      await perms.set(id, c)
    } catch (e) {
      console.warn('[moshi] room perms', e)
      setProblem(t('เปลี่ยนสิทธิ์ไม่สำเร็จ ลองใหม่อีกทีนะ', "Couldn't change that. Try again"))
    } finally {
      setBusy(null)
    }
  }
  return (
    <section aria-labelledby="perms-title" className="card mt-6 p-4">
      <h3 id="perms-title" className="font-display text-lg font-semibold text-ink">
        {t('สิทธิ์ส่งรูปในห้องนี้', 'Who can post photos here')}
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        {perms.admin
          ? t('พี่โมชิ (โฮสต์) และทีมงานส่งรูปได้เสมอ เปิดให้สมาชิกคนอื่นทีละคนได้ที่นี่', 'Hosts and staff can always post photos. Turn it on for other members one by one here')
          : t('คุณเป็นพี่โมชิของห้องนี้ เปิดหรือปิดสิทธิ์ส่งรูปให้สมาชิกได้ที่นี่', "You host this room. Turn photo posting on or off for members here")}
      </p>
      {problem && (
        <p role="alert" className="mt-2 text-sm text-ink">
          {problem}
        </p>
      )}
      <ul className="mt-3 divide-y divide-line">
        {members.map((u) => {
          const p = perms.perms.get(u.id) ?? { host: false, images: false }
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar color={u.color} size={40} />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{u.name}</span>
              <Toggle
                on={p.host || p.images}
                disabled={p.host || busy === u.id}
                label={p.host ? t('ส่งรูปได้ (โฮสต์)', 'Photos (host)') : t('ส่งรูปได้', 'Photos')}
                onChange={(on) => void change(u.id, { images: on })}
              />
              {perms.admin && (
                <Toggle on={p.host} disabled={busy === u.id} label={t('พี่โมชิ', 'Host')} onChange={(on) => void change(u.id, { host: on })} />
              )}
            </li>
          )
        })}
      </ul>
      {!members.length && <p className="mt-3 text-sm text-ink-soft">{t('ยังไม่มีสมาชิกคนอื่นในห้องนี้', 'No other members in this room yet')}</p>}
    </section>
  )
}

function Toggle({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${on ? 'bg-mint/70 text-ink' : 'bg-white text-ink-soft ring-1 ring-line'}`}
    >
      <span aria-hidden className={`inline-block size-3 rounded-full ${on ? 'bg-ink' : 'bg-line'}`} />
      {label}
    </button>
  )
}
