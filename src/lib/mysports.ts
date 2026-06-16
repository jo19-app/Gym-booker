import type { Course } from './types'
import { STUDIO_SLUG } from './types'

const BASE = 'https://member.peoplesfitness.de'

export async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Login failed (${res.status})`)
  const data = await res.json()
  const token = data.access_token || data.sessionId
  if (!token) throw new Error('No token in response')
  return token
}

export async function fetchCourses(token: string, fromDate: string, toDate: string): Promise<Course[]> {
  const params = new URLSearchParams({ from: fromDate, to: toDate })
  const res = await fetch(`${BASE}/studio/${STUDIO_SLUG}/courses?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Fetching courses failed (${res.status})`)
  const data = await res.json()
  const raw: Course[] = Array.isArray(data) ? data : (data.courses || data.data || [])
  return raw.map(c => ({
    ...c,
    bookingOpensAt: c.bookingOpensAt
      ?? new Date(new Date(c.startTime).getTime() - 48 * 60 * 60 * 1000).toISOString(),
  }))
}

export async function bookCourse(token: string, courseId: string) {
  const res = await fetch(`${BASE}/studio/${STUDIO_SLUG}/courses/${courseId}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (res.ok || res.status === 201) {
    return {
      success: true,
      message: data.waitlisted ? 'Added to waitlist' : 'Booking confirmed',
      bookingId: data.id || data.bookingId,
      waitlisted: !!data.waitlisted,
    }
  }
  return {
    success: false,
    message: data.message || data.error || `Booking failed (${res.status})`,
  }
}