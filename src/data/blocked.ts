import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMoshi } from '@/lib/store'
import type { MochiColor, User } from '@/lib/types'
import { useCatalog } from './catalog'
import { toBlockedPerson } from './live/map'
import type { BlockedPersonRow } from './live/rows'
import { isServerId } from './live/sample'
import { myBlockedPeople } from './live/writes'

/*
 * The people I blocked, for Me → ตั้งค่า → คนที่บล็อกไว้ (where they can be unblocked).
 * Who is on the list comes from store.blocked, so someone I unblock leaves it at once (and comes
 * back if the unblock fails). Live: names and looks from my_blocked_people()
 * (supabase/migrations/20261108000006_rooms_and_blocks.sql), because the profiles table hides
 * blocked people from me; someone blocked a moment ago comes from the people already loaded.
 * Demo (and sample people in live mode): the people already loaded, i.e. the mock people.
 */

export interface BlockedPerson {
  id: string
  name: string
  color: MochiColor
  face?: User['face']
  accessory?: User['accessory']
  /** when I blocked them (live only) */
  blockedAt?: string
}

/** someone blocked a moment ago (no server time yet) counts as the newest */
const NEWEST = Number.MAX_SAFE_INTEGER
const when = (p: BlockedPerson) => (p.blockedAt ? Date.parse(p.blockedAt) || 0 : NEWEST)

/** Newest first. `people` is null until the first load answers, and stays null if it failed (`error`). */
export function useBlockedPeople(): { people: BlockedPerson[] | null; error: boolean; reload: () => void } {
  const live = useCatalog((s) => s.mode) === 'live'
  const blocked = useMoshi((s) => s.blocked)
  const everyone = useCatalog((s) => s.people)
  const [rows, setRows] = useState<Map<string, BlockedPersonRow> | null>(null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)
  // sample people never reach the server: nothing to ask while they're all there is
  const ask = live && blocked.some(isServerId)

  // again whenever the list changes (a block or an unblock); only the newest answer counts
  useEffect(() => {
    if (!ask) return
    let stale = false
    myBlockedPeople()
      .then((list) => {
        if (stale) return
        setRows(new Map(list.map((r) => [r.user_id, r])))
        setError(false)
      })
      .catch((err) => {
        if (stale) return
        console.warn('[moshi] blocked list failed', err)
        setError(true)
      })
    return () => {
      stale = true
    }
  }, [ask, blocked, tick])

  const reload = useCallback(() => {
    setError(false)
    setTick((n) => n + 1)
  }, [])

  const people = useMemo(() => {
    if (ask && !rows) return null
    const loaded = new Map(everyone.map((u) => [u.id, u]))
    const list: BlockedPerson[] = []
    // the store adds each new block at the end
    for (const id of [...blocked].reverse()) {
      const row = rows?.get(id)
      const user = loaded.get(id)
      if (row && (row.name !== null || !user)) list.push(toBlockedPerson(row))
      else if (user) {
        const at = row?.blocked_at
        list.push({ id, name: user.name, color: user.color, face: user.face, accessory: user.accessory, ...(at ? { blockedAt: at } : {}) })
      }
    }
    return list.sort((a, b) => when(b) - when(a))
  }, [ask, rows, blocked, everyone])

  return { people, error, reload }
}
