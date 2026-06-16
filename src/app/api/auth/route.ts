import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { loadUser } from '@/lib/storage'
import { getToken, fetchCourses } from '@/lib/mysports'
import { getScheduleFetchRange } from '@/lib/timing'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const profile = loadUser(session.userId)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const token = await getToken(profile.email, profile.passwordHash)
    const { from, to } = getScheduleFetchRange()
    const courses = await fetchCourses(token, from, to)
    return NextResponse.json({ courses })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}