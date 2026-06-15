import type { Course } from './types'
import { MYSPORTS_API, STUDIO_SLUG } from './types'

export async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${MYSPORTS_API}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Login failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  const token = data.token || data.access_token || data.jwt
  if (!token) throw new Error('No token in login response')
  return token
}

export async function fetchCourses(
  token: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string
): Promise<Course[]> {
  const params = new URLSearchParams({ from: fromDate, to: toDate })
  const res = await fetch(
    `${MYSPORTS_API}/v1/studios/${STUDIO_SLUG}/courses?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`Fetching courses failed (${res.status})`)
  const data = await res.json()
  const raw: Course[] = Array.isArray(data) ? data : (data.courses || data.data || [])

  // Enrich each course: compute when its booking window opens
  return raw.map(c => ({
    ...c,
    bookingOpensAt: c.bookingOpensAt
      ?? new Date(new Date(c.startTime).getTime() - 48 * 60 * 60 * 1000).toISOString(),
  }))
}

export async function bookCourse(token: string, courseId: string) {
  const res = await fetch(
    `${MYSPORTS_API}/v1/studios/${STUDIO_SLUG}/courses/${courseId}/bookings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  )
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
