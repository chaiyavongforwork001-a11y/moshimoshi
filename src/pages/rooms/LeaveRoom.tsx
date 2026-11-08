import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button, RoomIcon, Sheet } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useMoshi } from '@/lib/store'
import type { Room } from '@/lib/types'

/**
 * Join / leave for a room button. Joining is one tap; leaving asks first, so a stray tap
 * on "อยู่ในห้องแล้ว" doesn't drop you out of a room by accident. Render `sheet` once.
 */
export function useRoomToggle() {
  const myRooms = useMoshi((s) => s.me.rooms)
  const joinRoom = useMoshi((s) => s.joinRoom)
  const leaveRoom = useMoshi((s) => s.leaveRoom)
  const [asking, setAsking] = useState<Room | null>(null)
  const toggle = (room: Room) => (myRooms.includes(room.id) ? setAsking(room) : joinRoom(room.id))
  const sheet = (
    <LeaveRoomSheet
      room={asking}
      onClose={() => setAsking(null)}
      onLeave={(room) => {
        leaveRoom(room.id)
        setAsking(null)
      }}
    />
  )
  return { toggle, sheet }
}

function LeaveRoomSheet({ room, onClose, onLeave }: { room: Room | null; onClose: () => void; onLeave: (room: Room) => void }) {
  // keep the last room on screen while the sheet slides away
  const [last, setLast] = useState(room)
  if (room && room !== last) setLast(room)
  const shown = room ?? last
  return (
    <Sheet open={!!room} onClose={onClose} title={t('ออกจากห้องนี้?', 'Leave this room?')} width={460}>
      {shown && (
        <div className="space-y-4 pb-3">
          <div className="flex items-center gap-3 rounded-3xl border border-line bg-white p-3">
            <RoomIcon room={shown} size={48} />
            <p className="min-w-0 text-ink">
              {t('จะออกจากห้อง', 'Leave ')}
              <b className="font-display font-semibold">{shown.name}</b>
              {t(' จริงๆ ใช่ไหม?', '?')}
            </p>
          </div>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>· {t('ห้องนี้จะหายไปจากรายการห้องของเรา', 'This room leaves your list of rooms')}</li>
            <li>· {t('ข้อความที่เคยคุยไว้ยังอยู่ในห้องเหมือนเดิม', 'Messages you sent stay in the room')}</li>
            <li>· {t('อยากกลับมาเมื่อไหร่ ก็กดเข้าห้องใหม่ได้ทุกเมื่อ', 'Come back and join again anytime')}</li>
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button variant="dark" block icon={<LogOut size={18} aria-hidden />} onClick={() => onLeave(shown)}>
              {t('ออกจากห้อง', 'Leave room')}
            </Button>
            <Button variant="ghost" block onClick={onClose}>
              {t('อยู่ในห้องต่อ', 'Stay in the room')}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
