// Dev-only: the scroll story scene driven by a slider instead of page scroll (used in /dev/3d).
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { StoryScene, View3D } from '@/components/three'
import { STORY_CHAPTERS, useStory } from '@/lib/scrollStory'

export function StoryBench() {
  const [v, setV] = useState(0)
  const [compact, setCompact] = useState(false)
  const chapter = useStory((s) => s.chapter)

  useEffect(() => {
    useStory.getState().setScroll(v, 0)
  }, [v])
  useEffect(() => () => useStory.getState().setScroll(0, 0), [])

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Story — scroll slider</h2>
        <Link to="/dev/story" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink-soft underline">
          full screen
        </Link>
      </div>
      <figure className="mt-3 rounded-3xl p-2 ring-1 ring-ink/10">
        <View3D className={compact ? 'mx-auto aspect-[9/19] h-[42rem] max-w-full' : 'aspect-video w-full'} label="ตัวอย่างฉากเลื่อนเล่าเรื่อง">
          <StoryScene compact={compact} />
        </View3D>
        <figcaption className="mt-2 flex flex-wrap items-center gap-3 px-2">
          <span className="w-24 text-sm font-semibold text-ink">
            {chapter + 1}. {STORY_CHAPTERS[chapter]}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={v}
            onChange={(e) => setV(Number(e.target.value))}
            className="h-11 min-w-48 flex-1"
            aria-label="ความคืบหน้าของเรื่อง"
          />
          <span className="w-12 text-right text-sm text-ink-soft tabular-nums">{v.toFixed(2)}</span>
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
            compact
          </label>
        </figcaption>
      </figure>
    </section>
  )
}
