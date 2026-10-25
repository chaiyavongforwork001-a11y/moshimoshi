// Dev-only full-screen preview of the scroll story scene (/dev/story; also embedded in /dev/3d via StoryBench).
import { useEffect, useState } from 'react'
import { STORY_CHAPTERS, useStory } from '@/lib/scrollStory'
import { StoryScene, View3D } from '@/components/three'

export default function StoryPreview() {
  const [v, setV] = useState(0)
  const [compact, setCompact] = useState(() => window.innerWidth < 768)
  const chapter = useStory((s) => s.chapter)

  useEffect(() => {
    useStory.getState().setScroll(v, 0)
  }, [v])

  return (
    <div className="fixed inset-0 z-20">
      <View3D className="h-dvh w-full" label="ตัวอย่างฉากเลื่อนเล่าเรื่อง">
        <StoryScene compact={compact} />
      </View3D>
      <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-lg backdrop-blur">
        <span className="w-16 text-sm font-semibold text-ink">{STORY_CHAPTERS[chapter]}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          className="h-11 flex-1"
          aria-label="ความคืบหน้าของเรื่อง"
        />
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          compact
        </label>
      </div>
    </div>
  )
}
