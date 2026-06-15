import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { loadUser } from '@/lib/storage'
import { getToken, fetchCourses } from '@/lib/mysports'
import { getScheduleFetchRange } from '@/lib/timing'
import bcrypt from 'bcryptjs'

// We need the plain password to call MySports.
// We store the hash; to call the API we require the user to pass their password
// in the request (it's only used in-flight, never stored again).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

  const profile = loadUser(session.userId)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verify the password against stored hash
  const ok = await bcrypt.compare(password, profile.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Wrong password' }, { status: 401 })

  try {
    const token = await getToken(profile.email, password)
    const { from, to } = getScheduleFetchRange()
    const courses = await fetchCourses(token, from, to)
    return NextResponse.json({ courses })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
