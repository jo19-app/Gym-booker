import type { Course } from './types'
import { STUDIO_SLUG } from './types'

const BASE = 'https://member.peoplesfitness.de'

const NOX_HEADERS = {
  'X-Tenant': 'peoples-gym',
  'X-Public-Facility-Group': 'BRANDENPEOPLESFITNESSCLUBS-9668881C08B84496B662DD3EB26D420C',
  'X-Nox-Client-Type': 'WEB',
  'X-Ms-Web-Context': `/studio/${STUDIO_SLUG}`,
  'X-Nox-Web-Context': 'v=1',
  'Content-Type': 'application/json',
}

export async function getToken(email: string, password: string): Promise<string> {
  const basic = btoa(`${email}:${password}`)
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      ...NOX_HEADERS,
      'Authorization': `Basic ${basic}`,
    },
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
    headers: { ...NOX_HEADERS, 'Authorization': `Bearer ${token}` },
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
    headers: { ...NOX_HEADERS, 'Authorization': `Bearer ${token}` },
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