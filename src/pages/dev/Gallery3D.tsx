import type { ReactNode } from 'react'
import {
  CallScene,
  HeroScene,
  Mochi,
  MochiCrowd,
  MochiStage,
  RetroPhone,
  SoftLights,
  View3D,
  ViewCamera,
  type MochiAccessory,
  type MochiFaceExpression,
  type MochiVariant,
} from '@/components/three'
import type { MochiColor } from '@/lib/types'
import { StoryBench } from './StoryBench'

const COLORS: MochiColor[] = ['peach', 'pink', 'lavender', 'mint', 'butter', 'sky', 'cream']
const EXPRESSIONS: MochiFaceExpression[] = ['smile', 'happy', 'wink', 'sleepy', 'talk', 'wow', 'sparkle']
const ACCESSORIES: MochiAccessory[] = ['headset', 'leaf', 'bow', 'cap']
const VARIANTS: MochiVariant[] = ['plain', 'sprout', 'bunny', 'cat', 'ahoge', 'chick', 'drop', 'ribbon']

function Cell({ label, children, className = 'h-64' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure className="rounded-3xl p-2 ring-1 ring-ink/10">
      <View3D className={`w-full ${className}`}>{children}</View3D>
      <figcaption className="px-2 pb-1 text-center text-sm font-semibold text-ink-soft">{label}</figcaption>
    </figure>
  )
}

function Solo({
  color,
  expression = 'smile',
  accessory,
  variant,
  omega,
}: {
  color: MochiColor
  expression?: MochiFaceExpression
  accessory?: MochiAccessory
  variant?: MochiVariant
  omega?: boolean
}) {
  return (
    <>
      <ViewCamera fit={[1.35, 1.3]} target={[0, 0.12, 0]} y={0.3} />
      <SoftLights />
      <Mochi
        color={color}
        expression={expression}
        accessory={accessory}
        variant={variant}
        omega={omega}
        lookAtPointer
        squishOnTap
        draggable
        bounce
      />
    </>
  )
}

function Section({ title, children, cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' }: { title: string; children: ReactNode; cols?: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className={`mt-3 grid gap-3 ${cols}`}>{children}</div>
    </section>
  )
}

/** Dev bench for the characters and scenes (/dev/3d). */
export default function Gallery3D() {
  return (
    <main className="relative z-10 mx-auto max-w-7xl p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold">3D gallery (dev)</h1>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Cell label="inspect: peach (drag me with a mouse)" className="h-[520px]">
          <Solo color="peach" />
        </Cell>
        <Cell label="phone ringing (tap for an extra ring)" className="h-[520px]">
          <ViewCamera fit={[1.7, 1.25]} target={[0, 0.8, 0]} y={0.9} />
          <SoftLights />
          <RetroPhone ringing />
        </Cell>
      </div>

      <StoryBench />

      <Section title="Colours (auto variant)">
        {COLORS.map((c) => (
          <Cell key={c} label={c}>
            <Solo color={c} />
          </Cell>
        ))}
      </Section>

      <Section title="Expressions">
        {EXPRESSIONS.map((e, i) => (
          <Cell key={e} label={e}>
            <Solo color={COLORS[i % COLORS.length]} expression={e} variant="plain" />
          </Cell>
        ))}
        <Cell label="smile + omega">
          <Solo color="cream" omega variant="plain" />
        </Cell>
      </Section>

      <Section title="Accessories">
        {ACCESSORIES.map((a, i) => (
          <Cell key={a} label={a}>
            <Solo color={COLORS[(i + 2) % COLORS.length]} accessory={a} />
          </Cell>
        ))}
      </Section>

      <Section title="Variants (on peach)">
        {VARIANTS.map((v) => (
          <Cell key={v} label={v}>
            <Solo color="peach" variant={v} />
          </Cell>
        ))}
      </Section>

      <Section title="Hero — full bleed (wide 21:9, 16:9) and compact (9:19)" cols="grid-cols-1">
        <Cell label="HeroScene 21:9" className="aspect-[21/9]">
          <HeroScene />
        </Cell>
        <Cell label="HeroScene 16:9" className="aspect-video">
          <HeroScene />
        </Cell>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Cell label="HeroScene compact 9:19" className="aspect-[9/19]">
            <HeroScene compact />
          </Cell>
          <Cell label="HeroScene 4:5" className="aspect-[4/5]">
            <HeroScene />
          </Cell>
          <Cell label="HeroScene 1:1" className="aspect-square">
            <HeroScene />
          </Cell>
        </div>
      </Section>

      <Section title="Scenes" cols="grid-cols-1 md:grid-cols-2">
        <Cell label="MochiStage + bubble" className="h-80">
          <MochiStage color="lavender" bubble={['สวัสดีน้า~', 'วันนี้เป็นไงบ้าง']} />
        </Cell>
        <Cell label="MochiStage plain, no cushion" className="h-80">
          <MochiStage color="mint" expression="happy" stage={false} />
        </Cell>
        <Cell label="MochiCrowd" className="h-56">
          <MochiCrowd />
        </Cell>
        <Cell label="CallScene" className="h-80">
          <CallScene />
        </Cell>
      </Section>
    </main>
  )
}
