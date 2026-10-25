import { RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { Avatar, Button } from '@/components/ui'

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically/i
const RELOAD_KEY = 'moshi-chunk-reload'

function isChunkError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return CHUNK_ERROR.test(msg)
}

/**
 * Shown when a page throws or its chunk can't load (first visit offline, or
 * an old tab asking for files a new deploy replaced). A missing chunk gets one
 * automatic reload; anything else gets a calm "try again".
 */
export function RouteError() {
  const error = useRouteError()
  const chunk = isChunkError(error)

  useEffect(() => {
    if (!chunk) return
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return
      sessionStorage.setItem(RELOAD_KEY, '1')
    } catch {
      return
    }
    window.location.reload()
  }, [chunk])

  const retry = () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      /* storage blocked: reload anyway */
    }
    window.location.reload()
  }

  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card flex w-full max-w-md flex-col items-center gap-3 rounded-[2rem] px-6 py-10 text-center">
        <Avatar color="sky" size={104} face="sleepy" />
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{chunk ? 'สัญญาณสะดุดนิดนึง' : 'อุ๊ย สายหลุดไปแป๊บนึง'}</h1>
        <p className="max-w-xs text-ink-soft">
          {chunk
            ? 'หน้านี้โหลดไม่ครบ อาจเพราะเน็ตหลุดหรือเพิ่งมีอัปเดตใหม่ ลองโหลดอีกครั้งนะ'
            : 'มีอะไรผิดพลาดนิดหน่อย ไม่ใช่ความผิดของเราเลยนะ ลองใหม่อีกทีได้เลย'}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button icon={<RotateCcw size={18} aria-hidden />} onClick={retry}>
            ลองใหม่
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/app')}>
            กลับหน้าคืนนี้
          </Button>
        </div>
      </div>
    </main>
  )
}
