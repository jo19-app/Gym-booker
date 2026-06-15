import type { BookingEntry } from './types'
import { TIMEZONE, BOOKING_WINDOW_HOURS, CHECK_WINDOW_MINUTES } from './types'

const DAYS: Record<string, number> = {
  sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6
}

/** Returns true if right now is within ±CHECK_WINDOW_MINUTES of when this
 *  recurring weekly booking's booking-window opens (48h before class). */
export function isWeeklyWindowOpen(entry: BookingEntry, now = new Date()): boolean {
  if (entry.frequency !== 'weekly' || !entry.enabled) return false

  const targetDay = DAYS[entry.weekday]
  if (targetDay === undefined) return false
  const [hh, mm] = entry.time.split(':').map(Number)

  // Check the next 8 days for a match
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + d)

    const berlinDate = candidate.toLocaleDateString('sv', { timeZone: TIMEZONE }) // YYYY-MM-DD
    const [y, mo, day] = berlinDate.split('-').map(Number)

    // Berlin weekday
    const dow = new Date(`${berlinDate}T12:00:00`).getDay()
    if (dow !== targetDay) continue

    // Construct class start time in UTC
    const offset = getBerlinOffsetHours(candidate)
    const classUTC = Date.UTC(y, mo - 1, day, hh - offset, mm)

    const opensAt = classUTC - BOOKING_WINDOW_HOURS * 3600_000
    const windowStart = opensAt - CHECK_WINDOW_MINUTES * 60_000
    const windowEnd   = opensAt + CHECK_WINDOW_MINUTES * 60_000

    if (now.getTime() >= windowStart && now.getTime() <= windowEnd) return true
  }
  return false
}

/** Returns true if this one-off booking's window is open right now. */
export function isOnceWindowOpen(entry: BookingEntry, now = new Date()): boolean {
  if (entry.frequency !== 'once' || !entry.date || !entry.enabled) return false

  const [hh, mm] = entry.time.split(':').map(Number)
  const [y, mo, d] = entry.date.split('-').map(Number)
  const offset = getBerlinOffsetHours(now)

  const classUTC = Date.UTC(y, mo - 1, d, hh - offset, mm)
  if (now.getTime() >= classUTC) return false // class already started

  const opensAt = classUTC - BOOKING_WINDOW_HOURS * 3600_000
  const windowStart = opensAt - CHECK_WINDOW_MINUTES * 60_000
  const windowEnd   = opensAt + CHECK_WINDOW_MINUTES * 60_000

  return now.getTime() >= windowStart && now.getTime() <= windowEnd
}

function getBerlinOffsetHours(date: Date): number {
  const utcStr  = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const berStr  = date.toLocaleString('en-US', { timeZone: TIMEZONE })
  return (new Date(berStr).getTime() - new Date(utcStr).getTime()) / 3_600_000
}

/** Format a date+time nicely for emails */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: TIMEZONE,
  })
}

/** Get Berlin date range strings for fetching the schedule */
export function getScheduleFetchRange(): { from: string; to: string } {
  const now = new Date()
  const from = now.toLocaleDateString('sv', { timeZone: TIMEZONE })
  const to = new Date(now.getTime() + 8 * 86_400_000).toLocaleDateString('sv', { timeZone: TIMEZONE })
  return { from, to }
}
