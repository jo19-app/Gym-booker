import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/mysports'
import { loadUser, saveUser, emailToUserId } from '@/lib/storage'
import { createSession, sessionCookieOptions } from '@/lib/auth'
import type { UserProfile } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { action, email, password } = await req.json()

  if (action === 'login') {
    // Verify credentials directly with MySports
    let token: string
    try {
      token = await getToken(email, password)
    } catch {
      return NextResponse.json({ error: 'Email oder Passwort falsch' }, { status: 401 })
    }

    // Auto-create user profile if doesn't exist
    const userId = emailToUserId(email)
    let profile = loadUser(userId)
    if (!profile) {
      profile = {
        userId, email,
        passwordHash: password, // stored for cron use
        notificationEmail: email,
        bookings: [],
        createdAt: new Date().toISOString(),
      } as UserProfile
      saveUser(profile)
    } else {
      // Update stored password in case it changed
      profile.passwordHash = password
      saveUser(profile)
    }

    const session = await createSession({ userId, email })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(sessionCookieOptions(session))
    return res
  }

  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete('gym_session')
    return res
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}