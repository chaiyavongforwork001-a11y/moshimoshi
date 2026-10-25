import { Download, PlusSquare, Share } from 'lucide-react'
import { Button, Sheet } from '@/components/ui'
import { useInstallPrompt } from '@/lib/hooks'

/** "Install the app" — native prompt on Chrome/Edge/Android, manual steps on iOS Safari. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const install = useInstallPrompt()
  return (
    <Sheet open={open} onClose={onClose} title="ติดตั้ง moshimoshi บนมือถือ">
      <div className="space-y-4 pb-2">
        <p className="text-ink-soft">เปิดแอปได้จากหน้าจอโฮมเหมือนแอปทั่วไป เต็มจอ ไม่มีแถบเบราว์เซอร์ และได้แจ้งเตือนรอบคุย</p>
        {install.installed ? (
          <p className="rounded-2xl bg-mint/40 p-4 font-semibold">ติดตั้งเรียบร้อยแล้ว เปิดจากหน้าจอโฮมได้เลย</p>
        ) : install.canPrompt ? (
          <Button
            block
            size="lg"
            icon={<Download size={20} />}
            onClick={async () => {
              if (await install.prompt()) onClose()
            }}
          >
            ติดตั้งเลย
          </Button>
        ) : install.isIOS ? (
          <ol className="space-y-3">
            <li className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <Share size={22} className="shrink-0" /> แตะปุ่ม <b>แชร์</b> ด้านล่างของ Safari
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-white p-3">
              <PlusSquare size={22} className="shrink-0" /> เลือก <b>เพิ่มไปยังหน้าจอโฮม</b>
            </li>
          </ol>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm">
            เปิดหน้านี้ด้วย Chrome หรือ Safari บนมือถือ แล้วเลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มไปยังหน้าจอโฮม</b> จากเมนูของเบราว์เซอร์
          </p>
        )}
      </div>
    </Sheet>
  )
}
