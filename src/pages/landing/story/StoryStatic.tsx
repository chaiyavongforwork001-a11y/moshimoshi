import { MochiStage, View3D } from '@/components/three'
import { MOCHI } from '@/lib/colors'
import { t } from '@/lib/i18n'
import { Route } from 'lucide-react'
import { SectionIntro } from '../shared'
import { ChapterCard, CHAPTERS } from './chapters'

/** Reduced motion: no sticky journey, just the six chapters stacked with a calm mascot. */
export function StoryStatic() {
  return (
    <section id="story" aria-labelledby="story-title" className="relative scroll-mt-24 px-4 py-20 outline-none sm:px-6 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          id="story-title"
          eyebrow={t('ทำงานยังไง', 'How it works')}
          icon={<Route size={15} />}
          tone="bg-peach/60"
          title={t('เริ่มจากเรื่องที่ชอบ แล้วค่อยๆ สนิทกัน', 'Start with what you love, then grow\u00A0close')}
        >
          {t(
            'ไม่ต้องปัดหา ไม่ต้องลุ้นหน้าตา แค่มีเรื่องที่ชอบตรงกันก็คุยกันได้ยาวๆ',
            'No swiping, no judging looks. Love the same thing and the chats just keep flowing.',
          )}
        </SectionIntro>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.9fr_1.4fr]">
          <View3D className="h-72 w-full lg:sticky lg:top-28 lg:h-[26rem]" label={t('น้องโมชิยิ้มทักทาย', 'Little Mochi smiling hello')}>
            <MochiStage interactive={false} deco={false} bubble={t('โมชิโมชิ~', 'Moshi moshi~')} />
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
                  {t(`บทที่ ${i + 1} · ${c.eyebrow}`, `Chapter ${i + 1} · ${c.eyebrow}`)}
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
