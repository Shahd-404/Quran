import type { SessionRange } from './types'

export function generateSessionRanges(startPage: number, pagesToAssign: number, sessionsCount: number, totalPages: number): SessionRange[] {
  const sessions: SessionRange[] = []
  if (pagesToAssign <= 0) return sessions

  let cursor = startPage
  for (let i = 0; i < sessionsCount; i++) {
    const remaining = pagesToAssign - sessions.reduce((s, p) => s + p.pageCount, 0)
    if (remaining <= 0) break
    // Compute pages for this session: equal distribution with remainder to earlier sessions
    const sessionsLeft = sessionsCount - i
    const base = Math.floor(remaining / sessionsLeft)
    const rem = remaining % sessionsLeft
    const pageCount = base + (rem > 0 ? 1 : 0)
    const start = cursor
    const end = Math.min(totalPages, start + pageCount - 1)
    sessions.push({ sessionOrder: i + 1, startPage: start, endPage: end, pageCount: end - start + 1 })
    cursor = end + 1
  }

  return sessions
}
