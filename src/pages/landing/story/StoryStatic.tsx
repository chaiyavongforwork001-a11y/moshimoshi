import { MochiStage, View3D } from '@/components/three'
import { MOCHI } from '@/lib/colors'
import { Route } from 'lucide-react'
import { SectionIntro } from '../shared'
import { ChapterCard, CHAPTERS } from './chapters'

/** Reduced motion: no sticky journey, just the six chapters stacked with a calm mascot. */
export function StoryStatic() {
  return (
    <section id="story" aria-labelledby="story-title" className="relative scroll-mt-24 px-4 py-20 outline-none sm:px-6 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionIntro id="story-title" eyebrow="ทำงานยังไง" icon={<Route size={15} />} tone="bg-peach/60" title="เริ่มจากเรื่องที่ชอบ แล้วค่อยๆ สนิทกัน">
          ไม่ต้องปัดหา ไม่ต้องลุ้นหน้าตา แค่มีเรื่องที่ชอบตรงกันก็คุยกันได้ยาวๆ
        </SectionIntro>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.9fr_1.4fr]">
          <View3D className="h-72 w-full lg:sticky lg:top-28 lg:h-[26rem]" label="น้องโมชิยิ้มทักทาย">
            <MochiStage interactive={false} deco={false} bubble="โมชิโมชิ~" />
          </View3D>
          <ol className="grid gap-4 sm:grid-cols-2">
            {CHAPTERS.map((c, i) => (
              <li
                key={c.key}
                className={`rounded-[1.75rem] border border-white p-5 shadow-[var(--shadow-soft)] ${c.key === 'call' ? 'sm:col-span-2' : ''}`}
                style={{ backgroundImage: `linear-gradient(165deg, ${MOCHI[c.color].light} 0%, white 70%)` }}
              >
                <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink-soft">
                  <span className="inline-flex size-8 items-center justify-center rounded-full" style={{ background: MOCHI[c.color].base }} aria-hidden>
                    <c.Icon size={16} strokeWidth={2.5} className="text-ink" />
                  </span>
                  บทที่ {i + 1} · {c.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{c.title}</h3>
                <p className="mt-1 text-[15px] text-ink-soft">{c.line}</p>
                <div className="mt-4">
                  <ChapterCard chapter={c.key} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
