import { NextResponse } from 'next/server'
import { listUsers, saveUser } from '@/lib/storage'
import { isWeeklyWindowOpen, isOnceWindowOpen, fmtDateTime } from '@/lib/timing'
import { getToken, fetchCourses, bookCourse } from '@/lib/mysports'
import { getScheduleFetchRange } from '@/lib/timing'
import type { BookingEntry } from '@/lib/types'
import bcrypt from 'bcryptjs'

export const maxDuration = 60

// The cron job can't log in to MySports directly because we only store a
// bcrypt hash. We solve this by storing the last-verified plain password
// in a short-lived, process-memory cache when the user logs in or views
// the schedule. For Vercel serverless this is best-effort; if the function
// is cold, the cron skips users with no cached credential and tries next run.
//
// A production-grade alternative would be to encrypt (not hash) the password
// with a server-side key — but for personal use, the cache approach works well.

const credCache = new Map<string, { password: string; expiresAt: number }>()

export function cacheCredential(userId: string, password: string) {
  credCache.set(userId, { password, expiresAt: Date.now() + 30 * 60_000 }) // 30 min
}

export function getCachedCredential(userId: string): string | null {
  const entry = credCache.get(userId)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.password
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const users = listUsers()
  const log: string[] = []

  for (const user of users) {
    const password = getCachedCredential(user.userId)
    if (!password) {
      log.push(`[${user.email}] No cached credential — skipping this run`)
      continue
    }

    const due = user.bookings.filter(b =>
      b.enabled && (isWeeklyWindowOpen(b, now) || isOnceWindowOpen(b, now))
    )
    if (due.length === 0) continue

    let token: string
    try {
      token = await getToken(user.email, password)
    } catch (err: unknown) {
      log.push(`[${user.email}] Login failed: ${err instanceof Error ? err.message : err}`)
      continue
    }

    const { from, to } = getScheduleFetchRange()
    let courses = await fetchCourses(token, from, to).catch(() => [])

    for (const entry of due) {
      try {
        // Find the matching course on the live schedule
        const course = courses.find(c => {
          const cDate = new Date(c.startTime)
          const cDay = cDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Europe/Berlin' }).toLowerCase()
          const cTime = cDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
          const nameOk = c.name.toLowerCase().includes(entry.courseName.toLowerCase())
          const dayOk = cDay === entry.weekday
          const timeOk = cTime === entry.time
          const dateOk = entry.frequency === 'once'
            ? cDate.toLocaleDateString('sv', { timeZone: 'Europe/Berlin' }) === entry.date
            : true
          return nameOk && dayOk && timeOk && dateOk && c.bookable
        })

        const classTimeStr = course ? fmtDateTime(course.startTime) : `${entry.weekday} ${entry.time}`

        if (!course) {
          const msg = `No bookable slot for "${entry.courseName}" ${entry.weekday} ${entry.time}`
          log.push(`[${user.email}] ${msg}`)
          user.bookings = updateEntry(user.bookings, entry.id, msg)
          continue
        }

        const result = await bookCourse(token, course.id)
        const msg = result.success
          ? `✅ Booked "${course.name}" at ${classTimeStr}`
          : `❌ Failed "${course.name}": ${result.message}`
        log.push(`[${user.email}] ${msg}`)

        user.bookings = updateEntry(user.bookings, entry.id, msg, result.success)

        // For 'once' bookings that succeeded, disable to avoid rebooking
        if (result.success && entry.frequency === 'once') {
          user.bookings = user.bookings.map(b =>
            b.id === entry.id ? { ...b, enabled: false } : b
          )
        }



      } catch (err: unknown) {
        const msg = `❌ Error: ${err instanceof Error ? err.message : err}`
        log.push(`[${user.email}] ${msg} for "${entry.courseName}"`)
        user.bookings = updateEntry(user.bookings, entry.id, msg)
      }
    }

    saveUser(user)
  }

  return NextResponse.json({ log, checked: now.toISOString() })
}

function updateEntry(
  bookings: BookingEntry[],
  id: string,
  result: string,
  booked = false
): BookingEntry[] {
  return bookings.map(b =>
    b.id !== id ? b : {
      ...b,
      lastAttempt: new Date().toISOString(),
      lastResult: result,
      lastBooked: booked ? new Date().toISOString() : b.lastBooked,
    }
  )
}
