import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { loadUser, saveUser } from '@/lib/storage'
import type { BookingEntry } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const profile = loadUser(session.userId)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    email: profile.email,
    notificationEmail: profile.notificationEmail,
    bookings: profile.bookings,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const profile = loadUser(session.userId)
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()

  if (body.bookings !== undefined) {
    profile.bookings = body.bookings as BookingEntry[]
  }
  if (body.notificationEmail) {
    profile.notificationEmail = body.notificationEmail
  }

  saveUser(profile)
  return NextResponse.json({ ok: true })
}
