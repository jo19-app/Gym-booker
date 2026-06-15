import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { loadUser, saveUser, emailToUserId } from '@/lib/storage'
import { getToken } from '@/lib/mysports'
import { createSession, sessionCookieOptions } from '@/lib/auth'
import type { UserProfile } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { action, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  // ── Register ──────────────────────────────────────────────────────────────
  if (action === 'register') {
    const userId = emailToUserId(email)
    const existing = loadUser(userId)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 })
    }

    // Verify the credentials actually work on MySports before storing
    try {
      await getToken(email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Could not verify gym credentials: ${msg}` }, { status: 401 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const profile: UserProfile = {
      userId,
      email,
      passwordHash,
      notificationEmail: email,
      bookings: [],
      createdAt: new Date().toISOString(),
    }
    saveUser(profile)

    const token = await createSession({ userId, email })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(sessionCookieOptions(token))
    return res
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const userId = emailToUserId(email)
    const profile = loadUser(userId)
    if (!profile) {
      return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 404 })
    }

    const ok = await bcrypt.compare(password, profile.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Wrong password.' }, { status: 401 })
    }

    const token = await createSession({ userId, email })
    const res = NextResponse.json({ ok: true })
    res.cookies.set(sessionCookieOptions(token))
    return res
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  if (action === 'logout') {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete('gym_session')
    return res
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
