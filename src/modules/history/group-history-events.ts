import { formatHistoryLocalDate } from './formatting'
import { HistoryDayGroup, HistoryEvent } from './types'

export function groupHistoryEvents(
  events: HistoryEvent[],
): HistoryDayGroup[] {
  const groups = new Map<string, HistoryEvent[]>()
  for (const event of events) {
    const existing = groups.get(event.localDate)
    if (existing) {
      existing.push(event)
    } else {
      groups.set(event.localDate, [event])
    }
  }

  return Array.from(groups, ([localDate, groupedEvents]) => ({
    localDate,
    formattedDate: formatHistoryLocalDate(localDate),
    totalPages: groupedEvents.reduce(
      (total, event) => total + event.pageCount,
      0,
    ),
    sessionCount: groupedEvents.length,
    events: groupedEvents,
  }))
}
