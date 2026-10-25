import { useMemo } from 'react'
import { useIntents, usePeople } from '@/data/hooks'
import { matchAll } from '@/lib/matching'
import { useMoshi } from '@/lib/store'
import type { Intent, MatchResult } from '@/lib/types'

/** What matching runs on: me, everyone else, and everyone else's open posts. */
export function useMatchInputs() {
  const me = useMoshi((s) => s.me)
  const people = usePeople()
  const all = useIntents()
  const others = useMemo(() => all.filter((i) => i.userId !== me.id), [all, me.id])
  return { me, people, others }
}

/** Everyone ranked as if `intents` were my only posts (a draft, one card, …). Pass a stable array. */
export function useMatchesFor(intents: Intent[]): MatchResult[] {
  const { me, people, others } = useMatchInputs()
  return useMemo(() => matchAll(me, intents, people, others), [me, intents, people, others])
}
